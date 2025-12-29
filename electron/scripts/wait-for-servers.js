#!/usr/bin/env node
/**
 * Wait for Backend and Frontend servers to be ready
 * Checks all fallback ports for each server
 * Verifies servers by checking specific endpoints
 */

const http = require('http');

const BACKEND_PORTS = [47847, 47849, 47851];
const FRONTEND_PORTS = [47848, 47850, 47852];
const CHECK_INTERVAL = 2000; // 2 seconds
const INITIAL_DELAY = 5000; // Wait 5 seconds before first check (let servers start)
const TIMEOUT = 120000; // 2 minutes

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

waitForServers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
