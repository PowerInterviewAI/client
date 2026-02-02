import { app, BrowserWindow, Menu, ipcMain } from 'electron';
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
import { setWindowBounds, setWindowReference } from './window-controls.js';
import { registerGlobalHotkeys, unregisterHotkeys } from './hotkeys.js';
import * as windowControls from './window-controls.js';

// Import services
import { configService, transcriptionService, vcamBridgeService, healthCheckService } from './services/index.js';

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
  await configService.load();

  // Register config IPC handlers (manages config internally)
  configService.registerHandlers();

  // Register transcription IPC handlers
  ipcMain.handle('transcription:start-self', async () => {
    await transcriptionService.startSelfTranscription();
  });

  ipcMain.handle('transcription:stop-self', async () => {
    await transcriptionService.stopSelfTranscription();
  });

  ipcMain.handle('transcription:start-other', async () => {
    await transcriptionService.startOtherTranscription();
  });

  ipcMain.handle('transcription:stop-other', async () => {
    await transcriptionService.stopOtherTranscription();
  });

  ipcMain.handle('transcription:get-status', async () => {
    return transcriptionService.getStatus();
  });

  // Register vcam bridge IPC handlers
  ipcMain.handle('vcam:start-bridge', async () => {
    await vcamBridgeService.startBridge();
  });

  ipcMain.handle('vcam:stop-bridge', async () => {
    await vcamBridgeService.stopBridge();
  });

  ipcMain.handle('vcam:get-status', async () => {
    return vcamBridgeService.getStatus();
  });

  // Register app state IPC handlers
  ipcMain.handle('app:get-state', async () => {
    return healthCheckService.getAppState();
  });

  ipcMain.handle('app:update-state', async (_event, updates) => {
    healthCheckService.updateAppState(updates);
    return healthCheckService.getAppState();
  });

  // Register app health check IPC handlers (deprecated - kept for compatibility)
  ipcMain.handle('app:ping', async () => {
    // Import AppApi dynamically to avoid circular dependencies
    const { ApiClient } = await import('./api/client.js');
    const { AppApi } = await import('./api/app.js');
    const { configManager } = await import('./config/app.js');
    
    const serverUrl = configManager.get('serverUrl');
    console.log('[IPC:app:ping] serverUrl from config:', serverUrl);
    const client = new ApiClient(serverUrl);
    const appApi = new AppApi(client);
    
    return appApi.ping();
  });

  ipcMain.handle('app:ping-client', async (_event, deviceInfo) => {
    const { ApiClient } = await import('./api/client.js');
    const { AppApi } = await import('./api/app.js');
    const { configManager } = await import('./config/app.js');
    
    const serverUrl = configManager.get('serverUrl');
    const client = new ApiClient(serverUrl);
    const appApi = new AppApi(client);
    
    return appApi.pingClient(deviceInfo);
  });

  ipcMain.handle('app:ping-gpu-server', async () => {
    const { ApiClient } = await import('./api/client.js');
    const { AppApi } = await import('./api/app.js');
    const { configManager } = await import('./config/app.js');
    
    const serverUrl = configManager.get('serverUrl');
    const client = new ApiClient(serverUrl);
    const appApi = new AppApi(client);
    
    return appApi.pingGpuServer();
  });

  ipcMain.handle('app:wakeup-gpu-server', async () => {
    const { ApiClient } = await import('./api/client.js');
    const { AppApi } = await import('./api/app.js');
    const { configManager } = await import('./config/app.js');
    
    const serverUrl = configManager.get('serverUrl');
    const client = new ApiClient(serverUrl);
    const appApi = new AppApi(client);
    
    return appApi.wakeupGpuServer();
  });

  // Create window
  await createWindow();

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

  // Configuration auto-saves on changes, no need to save again on quit
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

// -------------------------------------------------------------
// IPC HANDLERS FOR WINDOW CONTROLS
// -------------------------------------------------------------
ipcMain.on('window-minimize', () => {
  if (win && !win.isDestroyed()) {
    win.minimize();
  }
});

ipcMain.on('window-close', () => {
  if (win && !win.isDestroyed()) {
    win.close();
  }
});

// Stealth controls: allow renderer to set or toggle stealth via IPC
ipcMain.on('set-stealth', (_event, isStealth: boolean) => {
  try {
    if (isStealth) {
      windowControls.enableStealth();
    } else {
      windowControls.disableStealth();
    }
  } catch (err) {
    console.warn('set-stealth handler error:', err);
  }
});

ipcMain.on('window-toggle-stealth', () => {
  try {
    windowControls.toggleStealth();
  } catch (err) {
    console.warn('window-toggle-stealth handler error:', err);
  }
});

// Renderer can request an opacity toggle (useful for UI buttons)
ipcMain.on('window-toggle-opacity', () => {
  try {
    windowControls.toggleOpacity();
  } catch (err) {
    console.warn('window-toggle-opacity handler error:', err);
  }
});

// Handle incremental resize deltas from renderer (edge dragging)
ipcMain.on('window-resize-delta', (_event, dx: number, dy: number, edge: string) => {
  try {
    if (!win || win.isDestroyed()) return;

    const minWidth = 300;
    const minHeight = 200;
    const bounds = win.getBounds();
    const nb = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };

    // Only handle right/bottom/bottom-right resizes (left/top grips disabled)
    if (edge.includes('right')) {
      nb.width += dx;
    }
    if (edge.includes('bottom')) {
      nb.height += dy;
    }

    // enforce minimums
    if (nb.width < minWidth) {
      nb.width = minWidth;
    }
    if (nb.height < minHeight) {
      nb.height = minHeight;
    }

    setWindowBounds(nb);
  } catch (err) {
    console.warn('window-resize-delta handler error:', err);
  }
});
