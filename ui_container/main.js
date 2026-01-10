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
        alwaysOnTop: true,
        transparent: true,
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

    win.setContentProtection(true);

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
