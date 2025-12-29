#!/usr/bin/env node
/**
 * Dev server with port fallback
 * Tries ports in order: 47848, 47850, 47852
 */

const { spawn } = require('child_process');
const net = require('net');

const PORT_OPTIONS = [47848, 47850, 47852];

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
  for (const port of PORT_OPTIONS) {
    const available = await isPortAvailable(port);
    if (available) {
      console.log(`✓ Port ${port} is available`);
      return port;
    }
    console.log(`✗ Port ${port} is in use, trying next...`);
  }
  throw new Error(`All ports are in use: ${PORT_OPTIONS.join(', ')}`);
}

async function main() {
  try {
    const port = await findAvailablePort();
    console.log(`Starting Frontend dev server on port ${port}...\n`);

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
