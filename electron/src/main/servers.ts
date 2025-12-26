import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { app } from 'electron';
import log from 'electron-log';

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

// Get node command based on platform
function getNodeCommand(): string {
  return process.platform === 'win32' ? 'node.exe' : 'node';
}

// Start backend server
async function startBackend(): Promise<void> {
  const { backend } = getPaths();

  // Check if port 3000 is available
  const portAvailable = await isPortAvailable(3000);
  if (!portAvailable) {
    throw new Error('Port 3000 is already in use. Please close any other applications using this port.');
  }

  log.info(`Starting backend from: ${backend}`);

  let command: string;
  let args: string[];
  let cwd: string;

  if (isDev) {
    // Development: use npm run dev
    command = getNpmCommand();
    args = ['run', 'dev'];
    cwd = backend;
  } else {
    // Production: use standalone server.js
    command = getNodeCommand();
    args = ['server.js'];
    cwd = backend;
  }

  backendProcess = spawn(command, args, {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: isDev ? 'development' : 'production',
      PORT: '3000',
    },
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

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
  // Patterns: "Ready on http://...", "Listening on port 3000", "started server on"
  try {
    await waitForProcessReady(backendProcess, /ready\s+on|listening\s+on|started\s+server|port\s*:?\s*3000/i, 60000);
    log.info('Backend server is ready on port 3000');
  } catch (err) {
    log.error('Backend failed to start:', err);
    throw new Error('Backend server failed to start. Please check the logs for details.');
  }
}

// Start frontend server
async function startFrontend(): Promise<void> {
  const { frontend } = getPaths();

  // Check if port 8081 is available
  const portAvailable = await isPortAvailable(8081);
  if (!portAvailable) {
    throw new Error('Port 8081 is already in use. Please close any other applications using this port.');
  }

  log.info(`Starting frontend from: ${frontend}`);

  let command: string;
  let args: string[];
  let cwd: string;

  if (isDev) {
    // Development: use npm run dev
    command = getNpmCommand();
    args = ['run', 'dev'];
    cwd = frontend;
  } else {
    // Production: use standalone server.js
    command = getNodeCommand();
    args = ['server.js'];
    cwd = frontend;
  }

  frontendProcess = spawn(command, args, {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: isDev ? 'development' : 'production',
      PORT: '8081',
    },
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

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
  // Patterns: "Ready on http://...", "Listening on port 8081", "started server on"
  try {
    await waitForProcessReady(frontendProcess, /ready\s+on|listening\s+on|started\s+server|port\s*:?\s*8081/i, 60000);
    log.info('Frontend server is ready on port 8081');
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
