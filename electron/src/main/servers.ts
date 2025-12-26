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

// Wait for a URL to become available
async function waitForUrl(url: string, timeout: number = 60000): Promise<void> {
  const startTime = Date.now();
  const checkInterval = 1000;

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok || response.status === 404) {
        // Server is responding
        return;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  throw new Error(`Timeout waiting for ${url} to become available`);
}

// Start backend server
async function startBackend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const { backend } = getPaths();
    const npmCmd = getNpmCommand();

    log.info(`Starting backend from: ${backend}`);

    const args = isDev ? ['run', 'dev'] : ['run', 'start'];

    backendProcess = spawn(npmCmd, args, {
      cwd: backend,
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
      reject(err);
    });

    backendProcess.on('exit', (code, signal) => {
      log.info(`Backend process exited with code ${code}, signal ${signal}`);
      backendProcess = null;
    });

    // Wait for backend to be ready
    waitForUrl('http://localhost:3000/api/health', 60000)
      .then(() => {
        log.info('Backend server is ready on port 3000');
        resolve();
      })
      .catch((err) => {
        log.error('Backend failed to start:', err);
        reject(new Error('Backend server failed to start. Please check if port 3000 is available.'));
      });
  });
}

// Start frontend server
async function startFrontend(): Promise<void> {
  return new Promise((resolve, reject) => {
    const { frontend } = getPaths();
    const npmCmd = getNpmCommand();

    log.info(`Starting frontend from: ${frontend}`);

    const args = isDev ? ['run', 'dev'] : ['run', 'start'];

    frontendProcess = spawn(npmCmd, args, {
      cwd: frontend,
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
      reject(err);
    });

    frontendProcess.on('exit', (code, signal) => {
      log.info(`Frontend process exited with code ${code}, signal ${signal}`);
      frontendProcess = null;
    });

    // Wait for frontend to be ready
    waitForUrl('http://localhost:8081', 60000)
      .then(() => {
        log.info('Frontend server is ready on port 8081');
        resolve();
      })
      .catch((err) => {
        log.error('Frontend failed to start:', err);
        reject(new Error('Frontend server failed to start. Please check if port 8081 is available.'));
      });
  });
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
