import { spawn, fork, ChildProcess } from 'child_process';
import { join } from 'path';
import { app } from 'electron';
import log from 'electron-log';
import { getConfig } from './config';

let backendProcess: ChildProcess | null = null;
let frontendProcess: ChildProcess | null = null;

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

// Start backend server
async function startBackend(): Promise<void> {
  const { backend } = getPaths();
  const config = getConfig();
  const backendPort = config.server.backendPort;

  // Check if port is available
  const portAvailable = await isPortAvailable(backendPort);
  if (!portAvailable) {
    throw new Error(`Port ${backendPort} is already in use. Please close any other applications using this port.`);
  }

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

  // Wait for backend to output ready message
  // Patterns: "Ready on http://...", "Listening on port", "started server on"
  try {
    const portPattern = new RegExp(`ready\\s+on|listening\\s+on|started\\s+server|port\\s*:?\\s*${backendPort}`, 'i');
    await waitForProcessReady(backendProcess, portPattern, 60000);
    log.info(`Backend server is ready on port ${backendPort}`);
  } catch (err) {
    log.error('Backend failed to start:', err);
    throw new Error('Backend server failed to start. Please check the logs for details.');
  }
}

// Start frontend server
async function startFrontend(): Promise<void> {
  const { frontend } = getPaths();
  const config = getConfig();
  const frontendPort = config.server.frontendPort;
  const backendPort = config.server.backendPort;

  // Check if port is available
  const portAvailable = await isPortAvailable(frontendPort);
  if (!portAvailable) {
    throw new Error(`Port ${frontendPort} is already in use. Please close any other applications using this port.`);
  }

  log.info(`Starting frontend from: ${frontend}`);
  log.info(`Frontend port: ${frontendPort}`);

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

  // Wait for frontend to output ready message
  // Patterns: "Ready on http://...", "Listening on port", "started server on"
  try {
    const portPattern = new RegExp(`ready\\s+on|listening\\s+on|started\\s+server|port\\s*:?\\s*${frontendPort}`, 'i');
    await waitForProcessReady(frontendProcess, portPattern, 60000);
    log.info(`Frontend server is ready on port ${frontendPort}`);
  } catch (err) {
    log.error('Frontend failed to start:', err);
    throw new Error('Frontend server failed to start. Please check the logs for details.');
  }
}

// Start all servers
export async function startServers(): Promise<void> {
  log.info('Starting all servers...');

  try {
    // Start backend first
    await startBackend();

    // Then start frontend
    await startFrontend();

    log.info('All servers started successfully');
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
} {
  return {
    backend: backendProcess && !backendProcess.killed ? 'running' : 'stopped',
    frontend: frontendProcess && !frontendProcess.killed ? 'running' : 'stopped',
  };
}
