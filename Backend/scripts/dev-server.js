#!/usr/bin/env node
/**
 * Dev server with port fallback
 * Tries ports in order: 47847, 47849, 47851
 * Kills stale processes from previous runs (detected via /api/health)
 */

const { spawn, execSync } = require('child_process');
const net = require('net');
const http = require('http');

const PORT_OPTIONS = [47847, 47849, 47851];

/**
 * Check if a process on the port is our stale Backend server
 * by checking if /api/health endpoint responds
 */
function isOurStaleServer(port) {
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

/**
 * Kill process LISTENING on a specific port (only our stale servers)
 */
function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      // Windows: find process LISTENING on the specific port
      // Use findstr with LISTENING to only get servers, not clients
      const result = execSync(`netstat -ano | findstr LISTENING | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      const lines = result.trim().split('\n');
      const killedPids = new Set();

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
              console.log(`Killed stale process ${pid} on port ${port}`);
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
          console.log(`Killed stale process ${pid} on port ${port}`);
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

async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort() {
  const primaryPort = PORT_OPTIONS[0];

  // Check if primary port has our stale server
  const isStale = await isOurStaleServer(primaryPort);
  if (isStale) {
    console.log(`Found stale Backend server on port ${primaryPort}, killing it...`);
    killProcessOnPort(primaryPort);
    // Wait for port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  for (const port of PORT_OPTIONS) {
    const available = await isPortAvailable(port);
    if (available) {
      console.log(`✓ Port ${port} is available`);
      return port;
    }
    console.log(`✗ Port ${port} is in use by other software, trying next...`);
  }
  throw new Error(`All ports are in use: ${PORT_OPTIONS.join(', ')}`);
}

async function main() {
  try {
    const port = await findAvailablePort();
    console.log(`Starting Backend dev server on port ${port}...\n`);

    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCmd, ['run', 'next-dev', '--', '-p', String(port)], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, PORT: String(port) },
    });

    child.on('exit', (code) => process.exit(code || 0));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
