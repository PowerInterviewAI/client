import path from 'path';
import fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import * as http from 'http';
import { app, BrowserWindow, dialog } from 'electron';

// Global state
let engine: ChildProcess | null = null;
let currentPort = 28080;
let isRestarting = false;
let restartTimestamps: number[] = [];

/**
 * Find a free port starting from the given port number
 */
function findFreePort(start: number): Promise<number> {
  return new Promise((resolve) => {
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
  return new Promise((resolve) => {
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
  restartTimestamps = restartTimestamps.filter((t) => now - t < 10000);

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

  // Check if engine.exe exists
  if (!fs.existsSync(exePath)) {
    console.error(`❌ Engine executable not found at: ${exePath}`);
    isRestarting = false;

    // Show error dialog to user
    dialog.showErrorBox(
      'Engine Not Found',
      `The Power Interview engine could not be found at:\n${exePath}\n\nPlease ensure the application is properly installed.`
    );

    // Clean exit
    app.quit();
    throw new Error(`Engine not found: ${exePath}`);
  }

  console.log(`🚀 Starting engine on port ${currentPort}`);

  engine = spawn(
    exePath,
    ['--port', currentPort.toString(), '--watch-parent', 'true', '--reload', 'false'],
    {
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  // Handle spawn errors (e.g., permission denied, executable format error)
  engine.on('error', (err) => {
    console.error('❌ Failed to start engine:', err);
    isRestarting = false;

    dialog.showErrorBox(
      'Engine Start Failed',
      `Failed to start the Power Interview engine:\n${err.message}\n\nThe application will now close.`
    );

    app.quit();
  });

  if (engine.stdout) {
    engine.stdout.on('data', (d) => console.log('[engine]', d.toString()));
  }
  if (engine.stderr) {
    engine.stderr.on('data', (d) => console.error('[engine ERR]', d.toString()));
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

/**
 * Stop the engine process cleanly
 */
export function stopEngine(): void {
  if (engine && !engine.killed) {
    console.log('🛑 Stopping engine process...');
    engine.kill('SIGTERM');

    // Force kill after 5 seconds if still running
    setTimeout(() => {
      if (engine && !engine.killed) {
        console.log('⚠️ Force killing engine process');
        engine.kill('SIGKILL');
      }
    }, 5000);
  }
  engine = null;
}
