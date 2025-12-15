const path = require("path");
const { app, BrowserWindow } = require("electron");
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
            win.loadURL(`http://localhost:${currentPort}`);
        }
    });

    // Wait for engine to fully boot
    await waitForServer(`http://localhost:${currentPort}`);

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
            win.loadURL(`http://localhost:${port}`);
        } else {
            win.loadURL("http://localhost:3000");
        }
    });
}

// -------------------------------------------------------------
// APP LIFECYCLE
// -------------------------------------------------------------
app.whenReady().then(createWindow);
