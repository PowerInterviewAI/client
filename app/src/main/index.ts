import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import ElectronStore from 'electron-store';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StoreSchema {
  windowBounds?: { x?: number; y?: number; width: number; height: number };
  _stealth?: boolean;
}

const store = new ElectronStore<StoreSchema>();

// Import modules
import { setWindowReference } from './services/window-control-service.js';
import { registerGlobalHotkeys, unregisterHotkeys } from './hotkeys.js';

// Import services
import {
  configStore,
  transcriptionService,
  vcamBridgeService,
  healthCheckService,
} from './services/index.js';

// Import IPC handlers
import { registerAppStateHandlers, registerWindowHandlers } from './ipc/index.js';
import { registerAuthHandlers } from './ipc/auth.js';

let win: BrowserWindow | null = null;

// Ensure the application name is set (used by native dialogs/title fallbacks)
try {
  if (typeof app.setName === 'function') {
    app.setName('Power Interview');
  }
} catch (err) {
  console.warn('Failed to set app name:', err);
}

// Prevent Chromium from aggressively throttling timers/rendering
// when the window is occluded or in the background. This improves
// continuous video playback when the window is not on top.
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

// -------------------------------------------------------------
// SINGLE INSTANCE LOCK
// -------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

// -------------------------------------------------------------
// CREATE WINDOW
// -------------------------------------------------------------
async function createWindow() {
  const savedBounds = (store.get('windowBounds') as {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }) || {
    width: 1024,
    height: 640,
  };

  win = new BrowserWindow({
    title: 'Power Interview',
    ...savedBounds,
    // transparent: true,
    // frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      // Keep renderer timers running and avoid throttling when the window
      // is occluded or not focused so video/audio playback remains smooth.
      backgroundThrottling: false,
    },
  });

  // Remove the default application menu and hide the menu bar
  /*try {
    Menu.setApplicationMenu(null);
  } catch (e) {
    console.warn('Failed to set application menu:', e);
  }
  win.setMenuBarVisibility(false);
  win.setAutoHideMenuBar(true);//*/

  // Enable content protection to prevent screen capture/recording
  win.setContentProtection(true);

  // Set window reference for window controls
  setWindowReference(win);

  win.on('close', () => {
    if (win) {
      store.set('windowBounds', win.getBounds());
    }
  });

  // Clear cache before loading
  await win.webContents.session.clearCache();

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // Use app.getAppPath() for conventional path resolution
    // This works correctly whether the app is packaged or not
    const distPath = path.join(app.getAppPath(), 'dist', 'index.html');
    console.log('Loading from:', distPath);
    win.loadFile(distPath);
  }
}

// -------------------------------------------------------------
// APP LIFECYCLE
// -------------------------------------------------------------
app.whenReady().then(async () => {
  // Initialize services
  configStore.load();

  // Register all IPC handlers
  await configStore.registerHandlers();
  await transcriptionService.registerHandlers();
  await vcamBridgeService.registerHandlers();
  registerAppStateHandlers();
  registerAuthHandlers();

  // Create window
  await createWindow();

  // Register window-specific IPC handlers
  if (win) {
    registerWindowHandlers(win);
  }

  // Start health check service
  healthCheckService.start();

  // Register hotkeys
  registerGlobalHotkeys();
});

app.on('will-quit', async () => {
  // Stop all services
  await transcriptionService.stopAll();
  await vcamBridgeService.stopBridge();
  healthCheckService.stop();

  unregisterHotkeys();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
