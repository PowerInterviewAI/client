import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import { app, BrowserWindow } from 'electron';

// Global state
let engine: ChildProcess | null = null;
let currentPort = 28080;
let isRestarting = false;
let restartTimestamps: number[] = [];

/**
 * Find a free port starting from the given port number
 */
function findFreePort(start: number): Promise<number> {
  return new Promise(resolve => {
    function tryPort(port: number) {
      const server = net.createServer();
      server.once('error', () => tryPort(port + 1));
      server.once('listening', () => {
        server.close(() => resolve(port));
      });
      server.listen(port, '127.0.0.1');
    }
    tryPort(start);
  });
}

/**
 * Wait for the engine server to be ready by polling the URL
 */
function waitForServer(url: string): Promise<void> {
  const http = require('http');

  return new Promise(resolve => {
    let attempts = 0;

    function check() {
      if (attempts++ > 50) return resolve(); // timeout fail-safe

      http
        .get(url, () => resolve())
        .on('error', () => {
          setTimeout(check, 200);
        });
    }

    check();
  });
}

/**
 * Start the engine process
 */
export async function startEngine(win: BrowserWindow): Promise<number> {
  if (isRestarting) return currentPort;
  isRestarting = true;

  // Track restart rate to avoid loops
  const now = Date.now();
  restartTimestamps.push(now);
  restartTimestamps = restartTimestamps.filter(t => now - t < 10000);

  if (restartTimestamps.length > 5) {
    console.error('❌ Engine restarting too fast. Not restarting again.');
    isRestarting = false;
    return currentPort;
  }

  currentPort = await findFreePort(currentPort);

  let exePath = app.isPackaged
    ? path.join(process.resourcesPath, '..', 'bin', 'engine.exe')
    : path.join(__dirname, '..', '..', 'bin', 'main.dist', 'engine.exe');
  exePath = path.normalize(exePath);
  console.log(`📂 Using engine path: ${exePath}`);

  console.log(`🚀 Starting engine on port ${currentPort}`);

  engine = spawn(exePath, ['--port', currentPort.toString(), '--watch-parent', 'true', '--reload', 'false'], {
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (engine.stdout) {
    engine.stdout.on('data', d => console.log('[engine]', d.toString()));
  }
  if (engine.stderr) {
    engine.stderr.on('data', d => console.error('[engine ERR]', d.toString()));
  }

  engine.on('exit', async (code, signal) => {
    console.log('⚠ engine exited:', { code, signal });

    console.log('🔁 Restarting engine...');

    // Restart safely
    isRestarting = false;
    await startEngine(win);

    if (win && !win.isDestroyed()) {
      win.loadURL(`http://localhost:${currentPort}/main`);
    }
  });

  // Wait for engine to fully boot
  await waitForServer(`http://localhost:${currentPort}/main`);

  isRestarting = false;
  return currentPort;
}

/**
 * Get the current port the engine is running on
 */
export function getCurrentPort(): number {
  return currentPort;
}
