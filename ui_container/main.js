const path = require("path");
const { app, BrowserWindow, globalShortcut, screen } = require("electron");
const { spawn } = require("child_process");
const net = require("net");
const Store = require("electron-store").default;
const store = new Store();

let win = null;
let engine = null;
let currentPort = 28080;
let isRestarting = false;
let restartTimestamps = [];

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
// FIND FREE PORT
// -------------------------------------------------------------
function findFreePort(start) {
    return new Promise(resolve => {
        function tryPort(port) {
            const server = net.createServer();
            server.once("error", () => tryPort(port + 1));
            server.once("listening", () => {
                server.close(() => resolve(port));
            });
            server.listen(port, "127.0.0.1");
        }
        tryPort(start);
    });
}

// -------------------------------------------------------------
// START ENGINE
// -------------------------------------------------------------
async function startEngine() {
    if (isRestarting) return;
    isRestarting = true;

    // Track restart rate to avoid loops
    const now = Date.now();
    restartTimestamps.push(now);
    restartTimestamps = restartTimestamps.filter(t => now - t < 10000);

    if (restartTimestamps.length > 5) {
        console.error("❌ Engine restarting too fast. Not restarting again.");
        isRestarting = false;
        return;
    }

    currentPort = await findFreePort(currentPort);

    let exePath = app.isPackaged
        ? path.join(process.resourcesPath, "..", "bin", "engine.exe")
        : path.join(__dirname, "bin", "main.dist", "engine.exe");
    exePath = path.normalize(exePath);
    console.log(`📂 Using engine path: ${exePath}`);

    console.log(`🚀 Starting engine on port ${currentPort}`);

    engine = spawn(exePath, [
        "--port", currentPort,
        "--watch-parent", "true",
        "--reload", "false"
    ], {
        detached: process.platform !== "win32",
        stdio: ["ignore", "pipe", "pipe"]
    });

    engine.stdout.on("data", d => console.log("[engine]", d.toString()));
    engine.stderr.on("data", d => console.error("[engine ERR]", d.toString()));

    engine.on("exit", async (code, signal) => {
        console.log("⚠ engine exited:", { code, signal });

        console.log("🔁 Restarting engine...");

        // Restart safely
        isRestarting = false;
        await startEngine();

        if (win && !win.isDestroyed()) {
            win.loadURL(`http://localhost:${currentPort}/main`);
        }
    });

    // Wait for engine to fully boot
    await waitForServer(`http://localhost:${currentPort}/main`);

    isRestarting = false;
    return currentPort;
}

// -------------------------------------------------------------
// WAIT FOR ENGINE SERVER
// -------------------------------------------------------------
function waitForServer(url) {
    const http = require("http");

    return new Promise(resolve => {
        let attempts = 0;

        function check() {
            if (attempts++ > 50) return resolve(); // timeout fail-safe

            http.get(url, () => resolve()).on("error", () => {
                setTimeout(check, 200);
            });
        }

        check();
    });
}

// -------------------------------------------------------------
// WINDOW CONTROL FUNCTIONS
// -------------------------------------------------------------
function moveWindowToCorner(corner) {
    if (!win || win.isDestroyed()) return;

    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    const { width: winWidth, height: winHeight } = win.getBounds();

    let x, y;

    switch (corner) {
        case 'top-left':
            x = 0;
            y = 0;
            break;
        case 'top-right':
            x = screenWidth - winWidth;
            y = 0;
            break;
        case 'bottom-left':
            x = 0;
            y = screenHeight - winHeight;
            break;
        case 'bottom-right':
            x = screenWidth - winWidth;
            y = screenHeight - winHeight;
            break;
        case 'center':
            x = Math.floor((screenWidth - winWidth) / 2);
            y = Math.floor((screenHeight - winHeight) / 2);
            break;
    }

    win.setBounds({ x, y, width: winWidth, height: winHeight });
    console.log(`🔄 Window moved to ${corner}`);
}

function toggleMaximize() {
    if (!win || win.isDestroyed()) return;
    if (win.isMaximized()) {
        win.unmaximize();
        console.log('🔄 Window unmaximized');
    } else {
        win.maximize();
        console.log('🔄 Window maximized');
    }
}

function toggleMinimize() {
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) {
        win.restore();
        console.log('🔄 Window restored');
    } else {
        win.minimize();
        console.log('🔄 Window minimized');
    }
}

function moveWindowByArrow(direction) {
    if (!win || win.isDestroyed()) return;

    const bounds = win.getBounds();
    const moveAmount = 20; // pixels to move

    switch (direction) {
        case 'up':
            bounds.y = Math.max(0, bounds.y - moveAmount);
            break;
        case 'down':
            const { height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
            bounds.y = Math.min(screenHeight - bounds.height, bounds.y + moveAmount);
            break;
        case 'left':
            bounds.x = Math.max(0, bounds.x - moveAmount);
            break;
        case 'right':
            const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
            bounds.x = Math.min(screenWidth - bounds.width, bounds.x + moveAmount);
            break;
    }

    win.setBounds(bounds);
    console.log(`🔄 Window moved ${direction} by ${moveAmount}px`);
}

function resizeWindowByArrow(direction) {
    if (!win || win.isDestroyed()) return;

    const bounds = win.getBounds();
    const resizeAmount = 20; // pixels to resize
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    switch (direction) {
        case 'up':
            // Decrease height (shrink upward)
            bounds.height = Math.max(200, bounds.height - resizeAmount); // minimum height of 200px
            break;
        case 'down':
            // Increase height (grow downward)
            bounds.height = Math.min(screenHeight, bounds.height + resizeAmount);
            break;
        case 'left':
            // Decrease width (shrink leftward)
            bounds.width = Math.max(300, bounds.width - resizeAmount); // minimum width of 300px
            break;
        case 'right':
            // Increase width (grow rightward)
            bounds.width = Math.min(screenWidth - bounds.x, bounds.width + resizeAmount);
            break;
    }

    win.setBounds(bounds);
    console.log(`🔄 Window resized ${direction} by ${resizeAmount}px`);
}

// -------------------------------------------------------------
// REGISTER GLOBAL HOTKEYS
// -------------------------------------------------------------
function registerGlobalHotkeys() {
    // Unregister existing hotkeys first
    globalShortcut.unregisterAll();

    // Window positioning hotkeys
    globalShortcut.register('CommandOrControl+Alt+1', () => moveWindowToCorner('top-left'));
    globalShortcut.register('CommandOrControl+Alt+2', () => moveWindowToCorner('top-right'));
    globalShortcut.register('CommandOrControl+Alt+3', () => moveWindowToCorner('bottom-left'));
    globalShortcut.register('CommandOrControl+Alt+4', () => moveWindowToCorner('bottom-right'));
    globalShortcut.register('CommandOrControl+Alt+5', () => moveWindowToCorner('center'));

    // Window state hotkeys
    globalShortcut.register('CommandOrControl+Alt+M', () => toggleMaximize());
    globalShortcut.register('CommandOrControl+Alt+N', () => toggleMinimize());
    globalShortcut.register('CommandOrControl+Alt+R', () => {
        if (win && !win.isDestroyed()) {
            win.restore();
            console.log('🔄 Window restored');
        }
    });

    // Arrow key movement hotkeys
    globalShortcut.register('CommandOrControl+Alt+Up', () => moveWindowByArrow('up'));
    globalShortcut.register('CommandOrControl+Alt+Down', () => moveWindowByArrow('down'));
    globalShortcut.register('CommandOrControl+Alt+Left', () => moveWindowByArrow('left'));
    globalShortcut.register('CommandOrControl+Alt+Right', () => moveWindowByArrow('right'));

    // Arrow key resize hotkeys (with Shift modifier)
    globalShortcut.register('CommandOrControl+Shift+Up', () => resizeWindowByArrow('up'));
    globalShortcut.register('CommandOrControl+Shift+Down', () => resizeWindowByArrow('down'));
    globalShortcut.register('CommandOrControl+Shift+Left', () => resizeWindowByArrow('left'));
    globalShortcut.register('CommandOrControl+Shift+Right', () => resizeWindowByArrow('right'));

    console.log('🎹 Global hotkeys registered:');
    console.log('  Ctrl+Alt+1: Move to top-left');
    console.log('  Ctrl+Alt+2: Move to top-right');
    console.log('  Ctrl+Alt+3: Move to bottom-left');
    console.log('  Ctrl+Alt+4: Move to bottom-right');
    console.log('  Ctrl+Alt+5: Center window');
    console.log('  Ctrl+Alt+M: Toggle maximize');
    console.log('  Ctrl+Alt+N: Toggle minimize');
    console.log('  Ctrl+Alt+R: Restore window');
    console.log('  Ctrl+Alt+↑: Move window up');
    console.log('  Ctrl+Alt+↓: Move window down');
    console.log('  Ctrl+Alt+←: Move window left');
    console.log('  Ctrl+Alt+→: Move window right');
    console.log('  Ctrl+Shift+↑: Decrease window height');
    console.log('  Ctrl+Shift+↓: Increase window height');
    console.log('  Ctrl+Shift+←: Decrease window width');
    console.log('  Ctrl+Shift+→: Increase window width');
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
        webPreferences: {
            preload: `${__dirname}/preload.js`
        }
    });

    win.setContentProtection(true);

    win.on("close", () => {
        store.set("windowBounds", win.getBounds());
    });

    win.webContents.session.clearCache().then(async () => {
        if (app.isPackaged) {
            const port = await startEngine();
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
    globalShortcut.unregisterAll();
});
