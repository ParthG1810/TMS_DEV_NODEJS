import { spawn, fork, ChildProcess, execSync } from 'child_process';
import { join } from 'path';
import { app } from 'electron';
import log from 'electron-log';
import http from 'http';
import { getConfig } from './config';

let backendProcess: ChildProcess | null = null;
let frontendProcess: ChildProcess | null = null;

// Track actual ports being used (may differ from config if fallback was needed)
let activeBackendPort: number | null = null;
let activeFrontendPort: number | null = null;

// Port fallback options (3 ports each)
const BACKEND_PORT_OPTIONS = [47847, 47849, 47851];
const FRONTEND_PORT_OPTIONS = [47848, 47850, 47852];

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Get paths based on environment
function getPaths(): { backend: string; frontend: string } {
  if (isDev) {
    return {
      backend: join(__dirname, '../../../Backend'),
      frontend: join(__dirname, '../../../Frontend'),
    };
  } else {
    // Production: resources are in app.getPath('resourcesPath')
    const resourcesPath = process.resourcesPath;
    return {
      backend: join(resourcesPath, 'backend'),
      frontend: join(resourcesPath, 'frontend'),
    };
  }
}

// Get npm command based on platform
function getNpmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

// Check if a port is available
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, '127.0.0.1');
  });
}

// Check if a port has our stale Backend server (via /api/health)
function isOurStaleBackendServer(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Check if a port has our stale Frontend server (via HTTP response)
function isOurStaleFrontendServer(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 304);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Kill process LISTENING on a specific port (only our stale servers)
function killProcessOnPort(port: number): boolean {
  try {
    if (process.platform === 'win32') {
      // Windows: find process LISTENING on the specific port
      // Use findstr with LISTENING to only get servers, not clients
      const result = execSync(`netstat -ano | findstr LISTENING | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      const lines = result.trim().split('\n');
      const killedPids = new Set<string>();

      for (const line of lines) {
        // Parse: TCP    0.0.0.0:47847    0.0.0.0:0    LISTENING    12345
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const localAddr = parts[1]; // e.g., "0.0.0.0:47847" or "127.0.0.1:47847"
          const pid = parts[parts.length - 1];

          // Only kill if it's actually listening on our exact port
          if (localAddr.endsWith(`:${port}`) && pid && pid !== '0' && !killedPids.has(pid)) {
            killedPids.add(pid);
            try {
              execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
              log.info(`Killed stale process ${pid} on port ${port}`);
            } catch (e) {
              // Process might already be gone
            }
          }
        }
      }
    } else {
      // Linux/Mac: use lsof and kill
      const result = execSync(`lsof -ti:${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      const pids = result.trim().split('\n').filter(Boolean);
      for (const pid of pids) {
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
          log.info(`Killed stale process ${pid} on port ${port}`);
        } catch (e) {
          // Process might already be gone
        }
      }
    }
    return true;
  } catch (e) {
    // No process found on port
    return false;
  }
}

// Find first available port from options list, killing stale processes if needed
async function findAvailablePort(
  portOptions: number[],
  serverName: string,
  isStaleServerCheck: (port: number) => Promise<boolean>
): Promise<number> {
  const primaryPort = portOptions[0];

  // Check if primary port has our stale server
  const isStale = await isStaleServerCheck(primaryPort);
  if (isStale) {
    log.info(`${serverName}: Found stale server on port ${primaryPort}, killing it...`);
    killProcessOnPort(primaryPort);
    // Wait for port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  for (const port of portOptions) {
    const available = await isPortAvailable(port);
    if (available) {
      log.info(`${serverName}: Port ${port} is available`);
      return port;
    }
    log.info(`${serverName}: Port ${port} is in use by other software, trying next...`);
  }

  // All ports are in use
  throw new Error(
    `All ${serverName} ports are in use (${portOptions.join(', ')}). ` +
    `Please close other applications using these ports.`
  );
}

// Wait for process to output ready message
function waitForProcessReady(proc: ChildProcess, readyPattern: RegExp, timeout: number = 60000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout waiting for server to start'));
    }, timeout);

    const checkOutput = (data: Buffer) => {
      const message = data.toString();
      if (readyPattern.test(message)) {
        clearTimeout(timeoutId);
        resolve();
      }
    };

    proc.stdout?.on('data', checkOutput);
    proc.stderr?.on('data', checkOutput);

    proc.once('exit', (code) => {
      clearTimeout(timeoutId);
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

// Wait for process to output ready message and extract the actual port
function waitForServerPort(proc: ChildProcess, expectedPort: number, timeout: number = 60000): Promise<number> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Timeout waiting for server to start'));
    }, timeout);

    // Patterns to detect server started and extract port:
    // - "started server on 0.0.0.0:47850"
    // - "ready - started server on 0.0.0.0:47850, url: http://localhost:47850"
    // - "Ready on http://localhost:47850"
    const portExtractPattern = /(?:started\s+server\s+on\s+[\d.]+:(\d+)|ready\s+on\s+https?:\/\/[^:]+:(\d+)|localhost:(\d+))/i;

    const checkOutput = (data: Buffer) => {
      const message = data.toString();

      // Try to extract port from "started server" or "ready on" message
      const match = message.match(portExtractPattern);
      if (match) {
        const actualPort = parseInt(match[1] || match[2] || match[3], 10);
        if (actualPort && !isNaN(actualPort)) {
          clearTimeout(timeoutId);
          resolve(actualPort);
          return;
        }
      }

      // Fallback: if we see generic ready patterns, use expected port
      if (/ready\s+on|listening\s+on|started\s+server/i.test(message)) {
        clearTimeout(timeoutId);
        resolve(expectedPort);
      }
    };

    proc.stdout?.on('data', checkOutput);
    proc.stderr?.on('data', checkOutput);

    proc.once('exit', (code) => {
      clearTimeout(timeoutId);
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

// Start backend server
async function startBackend(): Promise<number> {
  const { backend } = getPaths();
  const config = getConfig();

  // Find an available port from options (kills stale backend servers if detected)
  const backendPort = await findAvailablePort(BACKEND_PORT_OPTIONS, 'Backend', isOurStaleBackendServer);
  activeBackendPort = backendPort;

  log.info(`Starting backend from: ${backend}`);
  log.info(`Backend port: ${backendPort}`);

  // Build environment variables from config
  const envVars = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    PORT: String(backendPort),
    // Database config
    DB_HOST: config.database.host,
    DB_PORT: String(config.database.port),
    DB_USER: config.database.user,
    DB_PASSWORD: config.database.password,
    DB_NAME: config.database.name,
    // Google OAuth config
    GOOGLE_CLIENT_ID: config.google.clientId,
    GOOGLE_CLIENT_SECRET: config.google.clientSecret,
    GOOGLE_REDIRECT_URI: config.google.redirectUri,
    // JWT config
    JWT_SECRET: config.jwt.secret,
    JWT_EXPIRES_IN: config.jwt.expiresIn,
  };

  if (isDev) {
    // Development: use npm run dev
    const npmCmd = getNpmCommand();
    backendProcess = spawn(npmCmd, ['run', 'dev'], {
      cwd: backend,
      env: envVars,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } else {
    // Production: use Electron as Node.js to run standalone server.js
    // ELECTRON_RUN_AS_NODE makes Electron behave as a Node.js process
    const serverPath = join(backend, 'server.js');
    log.info(`Running backend server: ${serverPath}`);

    backendProcess = spawn(process.execPath, [serverPath], {
      cwd: backend,
      env: {
        ...envVars,
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }

  backendProcess.stdout?.on('data', (data: Buffer) => {
    const message = data.toString().trim();
    if (message) {
      log.info(`[Backend] ${message}`);
    }
  });

  backendProcess.stderr?.on('data', (data: Buffer) => {
    const message = data.toString().trim();
    if (message) {
      // Next.js outputs some info to stderr, so log as info unless it looks like an error
      if (message.toLowerCase().includes('error')) {
        log.error(`[Backend] ${message}`);
      } else {
        log.info(`[Backend] ${message}`);
      }
    }
  });

  backendProcess.on('error', (err) => {
    log.error('Backend process error:', err);
  });

  backendProcess.on('exit', (code, signal) => {
    log.info(`Backend process exited with code ${code}, signal ${signal}`);
    backendProcess = null;
  });

  // Wait for backend to output ready message and extract actual port
  // The dev-server.js may use a different port if the expected one is in use
  try {
    const actualPort = await waitForServerPort(backendProcess, backendPort, 60000);
    if (actualPort !== backendPort) {
      log.info(`Backend started on fallback port ${actualPort} instead of ${backendPort}`);
      activeBackendPort = actualPort;
    }
    log.info(`Backend server is ready on port ${actualPort}`);
    return actualPort;
  } catch (err) {
    log.error('Backend failed to start:', err);
    throw new Error('Backend server failed to start. Please check the logs for details.');
  }
}

// Start frontend server
async function startFrontend(backendPort: number): Promise<number> {
  const { frontend } = getPaths();
  const config = getConfig();

  // Find an available port from options (kills stale frontend servers if detected)
  const frontendPort = await findAvailablePort(FRONTEND_PORT_OPTIONS, 'Frontend', isOurStaleFrontendServer);
  activeFrontendPort = frontendPort;

  log.info(`Starting frontend from: ${frontend}`);
  log.info(`Frontend port: ${frontendPort}, connecting to backend on port: ${backendPort}`);

  // Build environment variables
  const envVars = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    PORT: String(frontendPort),
    // API URL for frontend to connect to backend
    HOST_API_KEY: `http://localhost:${backendPort}`,
    NEXT_PUBLIC_API_URL: `http://localhost:${backendPort}`,
  };

  if (isDev) {
    // Development: use npm run dev
    const npmCmd = getNpmCommand();
    frontendProcess = spawn(npmCmd, ['run', 'dev'], {
      cwd: frontend,
      env: envVars,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } else {
    // Production: use Electron as Node.js to run standalone server.js
    // ELECTRON_RUN_AS_NODE makes Electron behave as a Node.js process
    const serverPath = join(frontend, 'server.js');
    log.info(`Running frontend server: ${serverPath}`);

    frontendProcess = spawn(process.execPath, [serverPath], {
      cwd: frontend,
      env: {
        ...envVars,
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }

  frontendProcess.stdout?.on('data', (data: Buffer) => {
    const message = data.toString().trim();
    if (message) {
      log.info(`[Frontend] ${message}`);
    }
  });

  frontendProcess.stderr?.on('data', (data: Buffer) => {
    const message = data.toString().trim();
    if (message) {
      if (message.toLowerCase().includes('error')) {
        log.error(`[Frontend] ${message}`);
      } else {
        log.info(`[Frontend] ${message}`);
      }
    }
  });

  frontendProcess.on('error', (err) => {
    log.error('Frontend process error:', err);
  });

  frontendProcess.on('exit', (code, signal) => {
    log.info(`Frontend process exited with code ${code}, signal ${signal}`);
    frontendProcess = null;
  });

  // Wait for frontend to output ready message and extract actual port
  // The dev-server.js may use a different port if the expected one is in use
  try {
    const actualPort = await waitForServerPort(frontendProcess, frontendPort, 60000);
    if (actualPort !== frontendPort) {
      log.info(`Frontend started on fallback port ${actualPort} instead of ${frontendPort}`);
      activeFrontendPort = actualPort;
    }
    log.info(`Frontend server is ready on port ${actualPort}`);
    return actualPort;
  } catch (err) {
    log.error('Frontend failed to start:', err);
    throw new Error('Frontend server failed to start. Please check the logs for details.');
  }
}

// Start all servers
export async function startServers(): Promise<{ backendPort: number; frontendPort: number }> {
  log.info('Starting all servers...');

  try {
    // First, check if servers are already running (started by concurrently/npm scripts)
    // This avoids killing and restarting servers that are already up
    let existingBackendPort: number | null = null;
    let existingFrontendPort: number | null = null;

    for (const port of BACKEND_PORT_OPTIONS) {
      if (await isOurStaleBackendServer(port)) {
        existingBackendPort = port;
        log.info(`Found existing Backend server on port ${port}`);
        break;
      }
    }

    for (const port of FRONTEND_PORT_OPTIONS) {
      if (await isOurStaleFrontendServer(port)) {
        existingFrontendPort = port;
        log.info(`Found existing Frontend server on port ${port}`);
        break;
      }
    }

    // If both servers are already running, use them
    if (existingBackendPort && existingFrontendPort) {
      log.info(`Using existing servers (Backend: ${existingBackendPort}, Frontend: ${existingFrontendPort})`);
      activeBackendPort = existingBackendPort;
      activeFrontendPort = existingFrontendPort;
      return { backendPort: existingBackendPort, frontendPort: existingFrontendPort };
    }

    // Otherwise, start the servers (this will kill stale ones if needed)
    const backendPort = existingBackendPort || await startBackend();
    const frontendPort = existingFrontendPort || await startFrontend(backendPort);

    log.info(`All servers started successfully (Backend: ${backendPort}, Frontend: ${frontendPort})`);

    return { backendPort, frontendPort };
  } catch (error) {
    // If any server fails, stop all
    await stopServers();
    throw error;
  }
}

// Stop all servers gracefully
export async function stopServers(): Promise<void> {
  log.info('Stopping all servers...');

  const stopProcess = (proc: ChildProcess | null, name: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!proc || proc.killed) {
        log.info(`${name} process already stopped`);
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        log.warn(`Force killing ${name} process`);
        proc.kill('SIGKILL');
        resolve();
      }, 5000);

      proc.once('exit', () => {
        clearTimeout(timeout);
        log.info(`${name} process stopped gracefully`);
        resolve();
      });

      // Try graceful shutdown first
      if (process.platform === 'win32') {
        proc.kill(); // Windows doesn't support SIGTERM properly
      } else {
        proc.kill('SIGTERM');
      }
    });
  };

  await Promise.all([
    stopProcess(frontendProcess, 'Frontend'),
    stopProcess(backendProcess, 'Backend'),
  ]);

  frontendProcess = null;
  backendProcess = null;
  activeBackendPort = null;
  activeFrontendPort = null;

  log.info('All servers stopped');
}

// Check if servers are running
export function areServersRunning(): boolean {
  return (
    backendProcess !== null &&
    !backendProcess.killed &&
    frontendProcess !== null &&
    !frontendProcess.killed
  );
}

// Get server status
export function getServerStatus(): {
  backend: 'running' | 'stopped';
  frontend: 'running' | 'stopped';
  backendPort: number | null;
  frontendPort: number | null;
} {
  return {
    backend: backendProcess && !backendProcess.killed ? 'running' : 'stopped',
    frontend: frontendProcess && !frontendProcess.killed ? 'running' : 'stopped',
    backendPort: activeBackendPort,
    frontendPort: activeFrontendPort,
  };
}

// Get active ports
export function getActivePorts(): { backendPort: number | null; frontendPort: number | null } {
  return {
    backendPort: activeBackendPort,
    frontendPort: activeFrontendPort,
  };
}

// Get port options for reference
export function getPortOptions(): { backend: number[]; frontend: number[] } {
  return {
    backend: BACKEND_PORT_OPTIONS,
    frontend: FRONTEND_PORT_OPTIONS,
  };
}
