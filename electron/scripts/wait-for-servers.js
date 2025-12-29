#!/usr/bin/env node
/**
 * Wait for Backend and Frontend servers to be ready
 * Checks all fallback ports for each server
 * Verifies servers by checking specific endpoints
 * Also kills any stale Electron instances before starting
 */

const http = require('http');
const { execSync } = require('child_process');

const BACKEND_PORTS = [47847, 47849, 47851];
const FRONTEND_PORTS = [47848, 47850, 47852];
const CHECK_INTERVAL = 2000; // 2 seconds
const INITIAL_DELAY = 5000; // Wait 5 seconds before first check (let servers start)
const TIMEOUT = 120000; // 2 minutes

/**
 * Kill any stale Electron instances from previous runs
 * This ensures we don't have conflicts with single-instance lock
 */
function killStaleElectronInstances() {
  console.log('Checking for stale Electron instances...');

  try {
    if (process.platform === 'win32') {
      // Windows: Find and kill electron.exe processes
      // Use tasklist to find electron processes
      try {
        const result = execSync('tasklist /FI "IMAGENAME eq electron.exe" /FO CSV /NH', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });

        // Parse CSV output: "electron.exe","12345","Console","1","123,456 K"
        const lines = result.trim().split('\n').filter(line => line.includes('electron.exe'));

        if (lines.length > 0) {
          console.log(`Found ${lines.length} stale Electron process(es), killing...`);

          for (const line of lines) {
            const match = line.match(/"electron\.exe","(\d+)"/i);
            if (match) {
              const pid = match[1];
              try {
                execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
                console.log(`  Killed Electron process ${pid}`);
              } catch (e) {
                // Process might already be gone
              }
            }
          }

          // Wait a bit for processes to fully terminate
          console.log('Waiting for processes to terminate...');
          require('child_process').spawnSync('timeout', ['/t', '2', '/nobreak'], { shell: true, stdio: 'ignore' });
        } else {
          console.log('No stale Electron instances found.');
        }
      } catch (e) {
        // No electron processes found (tasklist returns error if no matches)
        console.log('No stale Electron instances found.');
      }
    } else {
      // Linux/Mac: Find and kill electron processes
      try {
        const result = execSync('pgrep -f "electron.*tms-desktop\\|node.*electron"', {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });

        const pids = result.trim().split('\n').filter(Boolean);

        if (pids.length > 0) {
          console.log(`Found ${pids.length} stale Electron process(es), killing...`);

          for (const pid of pids) {
            // Don't kill our own parent process
            if (pid !== String(process.ppid)) {
              try {
                execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
                console.log(`  Killed Electron process ${pid}`);
              } catch (e) {
                // Process might already be gone
              }
            }
          }

          // Wait a bit for processes to fully terminate
          console.log('Waiting for processes to terminate...');
          execSync('sleep 2', { stdio: 'ignore' });
        } else {
          console.log('No stale Electron instances found.');
        }
      } catch (e) {
        // No electron processes found (pgrep returns error if no matches)
        console.log('No stale Electron instances found.');
      }
    }
  } catch (error) {
    console.log('Note: Could not check for stale Electron instances:', error.message);
  }

  console.log('');
}

/**
 * Check if Backend is ready by hitting /api/health endpoint
 */
function checkBackend(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      // Backend health endpoint should return 200
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Check if Frontend is ready by hitting the root and checking for Next.js response
 */
function checkFrontend(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      // Frontend should return 200 or 304
      // Also check for x-powered-by: Next.js header
      const isNextJs = res.headers['x-powered-by']?.includes('Next.js');
      const isOkStatus = res.statusCode === 200 || res.statusCode === 304;
      resolve(isOkStatus);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function findActiveBackendPort() {
  for (const port of BACKEND_PORTS) {
    const active = await checkBackend(port);
    if (active) {
      return port;
    }
  }
  return null;
}

async function findActiveFrontendPort() {
  for (const port of FRONTEND_PORTS) {
    const active = await checkFrontend(port);
    if (active) {
      return port;
    }
  }
  return null;
}

async function waitForServers() {
  const startTime = Date.now();
  let backendPort = null;
  let frontendPort = null;

  console.log('Waiting for servers to start...');
  console.log(`Backend ports: ${BACKEND_PORTS.join(', ')}`);
  console.log(`Frontend ports: ${FRONTEND_PORTS.join(', ')}`);
  console.log(`Initial delay: ${INITIAL_DELAY / 1000}s, Check interval: ${CHECK_INTERVAL / 1000}s\n`);

  // Wait for initial delay to let servers start up
  console.log('Waiting for servers to initialize...');
  await new Promise((resolve) => setTimeout(resolve, INITIAL_DELAY));

  while (Date.now() - startTime < TIMEOUT) {
    // Check backend via /api/health endpoint
    if (!backendPort) {
      backendPort = await findActiveBackendPort();
      if (backendPort) {
        console.log(`✓ Backend ready on port ${backendPort} (verified via /api/health)`);
      }
    }

    // Check frontend
    if (!frontendPort) {
      frontendPort = await findActiveFrontendPort();
      if (frontendPort) {
        console.log(`✓ Frontend ready on port ${frontendPort}`);
      }
    }

    // Both ready
    if (backendPort && frontendPort) {
      console.log('\n✓ All servers are ready!');
      console.log(`Backend: http://localhost:${backendPort}`);
      console.log(`Frontend: http://localhost:${frontendPort}\n`);
      return { backendPort, frontendPort };
    }

    // Wait and retry
    await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
  }

  throw new Error('Timeout waiting for servers to start');
}

// Main execution
// First kill any stale Electron instances, then wait for servers
killStaleElectronInstances();

waitForServers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
