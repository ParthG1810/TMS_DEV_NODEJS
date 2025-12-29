#!/usr/bin/env node
/**
 * Dev server with port fallback
 * Tries ports in order: 47848, 47850, 47852
 * Kills stale processes from previous runs (detected via HTTP response)
 */

const { spawn, execSync } = require('child_process');
const net = require('net');
const http = require('http');

const PORT_OPTIONS = [47848, 47850, 47852];

/**
 * Check if a process on the port is our stale Frontend server
 * by checking if it responds to HTTP requests (Next.js server)
 */
function isOurStaleServer(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      // If it responds with 200/304, it's likely our Next.js server
      resolve(res.statusCode === 200 || res.statusCode === 304);
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
        // Parse: TCP    0.0.0.0:47848    0.0.0.0:0    LISTENING    12345
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const localAddr = parts[1]; // e.g., "0.0.0.0:47848" or "127.0.0.1:47848"
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
      server.close(() => {
        // Small delay after closing to ensure the port is fully released
        setTimeout(() => resolve(true), 100);
      });
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort() {
  const primaryPort = PORT_OPTIONS[0];

  // Check if primary port has our stale server
  const isStale = await isOurStaleServer(primaryPort);
  if (isStale) {
    console.log(`Found stale Frontend server on port ${primaryPort}, killing it...`);
    killProcessOnPort(primaryPort);
    // Wait for port to be released
    await new Promise(resolve => setTimeout(resolve, 2000));
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

async function startServer(port) {
  return new Promise((resolve, reject) => {
    console.log(`Starting Frontend dev server on port ${port}...\n`);

    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(npmCmd, ['run', 'next-dev', '--', '-p', String(port)], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, PORT: String(port) },
    });

    let started = false;
    let portInUse = false;
    let allOutput = '';

    const handleOutput = (data) => {
      const text = data.toString();
      allOutput += text;
      process.stdout.write(text);

      // Check if server started successfully
      if (text.includes('ready') || text.includes('started server')) {
        started = true;
        resolve({ child, port });
      }

      // Check if port is already in use
      if (text.includes('already in use') || text.includes('EADDRINUSE')) {
        portInUse = true;
      }
    };

    child.stdout.on('data', handleOutput);
    child.stderr.on('data', handleOutput);

    child.on('exit', (code) => {
      if (started) return; // Already resolved

      // Check if port was in use (either detected in output or implied by quick exit)
      if (portInUse || allOutput.includes('already in use') || allOutput.includes('EADDRINUSE')) {
        reject(new Error(`Port ${port} is already in use`));
      } else if (code !== 0) {
        reject(new Error(`Server exited with code ${code}`));
      } else {
        // Exited with code 0 but never started - likely port issue
        reject(new Error(`Server exited unexpectedly (port ${port} may be in use)`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!started) {
        child.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 30000);
  });
}

async function main() {
  for (const port of PORT_OPTIONS) {
    // First check: is port available?
    let available = await isPortAvailable(port);
    if (!available) {
      // Check if it's our stale server
      const isStale = await isOurStaleServer(port);
      if (isStale) {
        console.log(`Found stale Frontend server on port ${port}, killing it...`);
        killProcessOnPort(port);
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Re-check availability
        available = await isPortAvailable(port);
        if (!available) {
          console.log(`✗ Port ${port} still in use after killing stale server, trying next...`);
          continue;
        }
      } else {
        console.log(`✗ Port ${port} is in use by other software, trying next...`);
        continue;
      }
    }

    console.log(`✓ Port ${port} is available`);

    // Second check: verify port is still available right before starting
    // (small delay to let the previous check's socket fully close)
    await new Promise(resolve => setTimeout(resolve, 200));
    const stillAvailable = await isPortAvailable(port);
    if (!stillAvailable) {
      console.log(`✗ Port ${port} became unavailable, trying next...`);
      continue;
    }

    try {
      const { child } = await startServer(port);
      child.on('exit', (code) => process.exit(code || 0));
      // Keep the main process running
      return;
    } catch (err) {
      console.log(`Failed to start on port ${port}: ${err.message}`);
      console.log('Trying next port...\n');
    }
  }

  console.error(`All ports are in use: ${PORT_OPTIONS.join(', ')}`);
  process.exit(1);
}

main();
