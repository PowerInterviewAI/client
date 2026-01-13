const path = require("path");
const { app, BrowserWindow, Menu } = require("electron");
const Store = require("electron-store").default;
const store = new Store();

// Ensure the application name is set (used by native dialogs/title fallbacks)
try {
    if (typeof app.setName === 'function') {
        app.setName('Power Interview');
    } else if (typeof app.name !== 'undefined') {
        app.name = 'Power Interview';
    }
} catch (err) {
    // Non-fatal; proceed without failing the main process
    console.warn('Failed to set app name:', err && err.message ? err.message : err);
}

// Import modules
const { startEngine, getCurrentPort } = require('./engine');
const { setWindowBounds, setWindowReference } = require('./window-controls');
const { registerGlobalHotkeys, unregisterHotkeys } = require('./hotkeys');

let win = null;

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
    app.on("second-instance", () => {
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
    const savedBounds = store.get("windowBounds") || {
        width: 800,
        height: 600
    };

    win = new BrowserWindow({
        title: "Power Interview",
        ...savedBounds,
        transparent: true,
        frame: false,
        webPreferences: {
            preload: `${__dirname}/preload.js`,
            // Keep renderer timers running and avoid throttling when the window
            // is occluded or not focused so video/audio playback remains smooth.
            backgroundThrottling: false,
        }
    });

    // Remove the default application menu and hide the menu bar
    try {
        Menu.setApplicationMenu(null);
    } catch (e) {
        // Ignore if Menu not available for platform
    }
    win.setMenuBarVisibility(false);
    win.setAutoHideMenuBar(true);

    // Set window reference for window controls
    setWindowReference(win);

    win.on("close", () => {
        store.set("windowBounds", win.getBounds());
    });

    win.webContents.session.clearCache().then(async () => {
        if (app.isPackaged) {
            const port = await startEngine(app, win);
            win.loadURL(`http://localhost:${port}/main`);
        } else {
            win.loadURL("http://localhost:3000/main");
        }
    });
}

// -------------------------------------------------------------
// APP LIFECYCLE
// -------------------------------------------------------------
app.whenReady().then(async () => {
    await createWindow();
    registerGlobalHotkeys();
});

app.on('will-quit', () => {
    unregisterHotkeys();
});

// IPC handlers for window controls exposed to renderer via preload
const { ipcMain } = require('electron');
const windowControls = require('./window-controls');

ipcMain.on('window-minimize', () => { if (win && !win.isDestroyed()) win.minimize(); });
ipcMain.on('window-close', () => { if (win && !win.isDestroyed()) win.close(); });

// Stealth controls: allow renderer to set or toggle stealth via IPC
ipcMain.on('set-stealth', (event, isStealth) => {
    try {
        if (isStealth) windowControls.enableStealth(); else windowControls.disableStealth();
    } catch (err) {
        console.warn('set-stealth handler error:', err && err.message ? err.message : err);
    }
});

ipcMain.on('window-toggle-stealth', () => {
    try {
        windowControls.toggleStealth();
    } catch (err) {
        console.warn('window-toggle-stealth handler error:', err && err.message ? err.message : err);
    }
});

// Handle incremental resize deltas from renderer (edge dragging)
ipcMain.on('window-resize-delta', (event, dx, dy, edge) => {
    try {
        if (!win || win.isDestroyed()) return;
        const minWidth = 300;
        const minHeight = 200;
        const bounds = win.getBounds();
        let nb = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };

        // Only handle right/bottom/bottom-right resizes (left/top grips disabled)
        if (edge.includes('right')) {
            nb.width += dx;
        }
        if (edge.includes('bottom')) {
            nb.height += dy;
        }

        // enforce minimums and adjust origin if needed
        if (nb.width < minWidth) {
            nb.width = minWidth;
        }
        if (nb.height < minHeight) {
            nb.height = minHeight;
        }

        setWindowBounds(nb);
    } catch (err) {
        console.warn('window-resize-delta handler error:', err && err.message ? err.message : err);
    }
});
