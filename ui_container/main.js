const path = require("path");
const { app, BrowserWindow, Menu } = require("electron");
const Store = require("electron-store").default;
const store = new Store();

// Import modules
const { startEngine, getCurrentPort } = require('./engine');
const { setWindowReference } = require('./window-controls');
const { registerGlobalHotkeys, unregisterHotkeys } = require('./hotkeys');

let win = null;

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
            preload: `${__dirname}/preload.js`
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
ipcMain.on('window-minimize', () => { if (win && !win.isDestroyed()) win.minimize(); });
ipcMain.on('window-toggle-maximize', () => { if (win && !win.isDestroyed()) { if (win.isMaximized()) win.unmaximize(); else win.maximize(); }});
ipcMain.on('window-close', () => { if (win && !win.isDestroyed()) win.close(); });
ipcMain.handle('window-is-maximized', () => { return !!(win && !win.isDestroyed() && win.isMaximized()); });

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

        win.setBounds(nb);
    } catch (err) {
        console.warn('window-resize-delta handler error:', err && err.message ? err.message : err);
    }
});
