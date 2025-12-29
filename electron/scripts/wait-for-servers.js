#!/usr/bin/env node
/**
 * Wait for Backend and Frontend servers to be ready
 * Checks all fallback ports for each server
 */

const http = require('http');

const BACKEND_PORTS = [47847, 47849, 47851];
const FRONTEND_PORTS = [47848, 47850, 47852];
const CHECK_INTERVAL = 1000; // 1 second
const TIMEOUT = 120000; // 2 minutes

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function findActivePort(ports, serverName) {
  for (const port of ports) {
    const active = await checkPort(port);
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
  console.log(`Frontend ports: ${FRONTEND_PORTS.join(', ')}\n`);

  while (Date.now() - startTime < TIMEOUT) {
    // Check backend
    if (!backendPort) {
      backendPort = await findActivePort(BACKEND_PORTS, 'Backend');
      if (backendPort) {
        console.log(`✓ Backend ready on port ${backendPort}`);
      }
    }

    // Check frontend
    if (!frontendPort) {
      frontendPort = await findActivePort(FRONTEND_PORTS, 'Frontend');
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
