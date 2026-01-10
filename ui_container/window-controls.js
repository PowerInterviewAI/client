const { screen } = require("electron");

// Global reference to the main window (will be set from main.js)
let win = null;
let _stealth = false;

// -------------------------------------------------------------
// WINDOW CONTROL FUNCTIONS
// -------------------------------------------------------------
function setWindowReference(window) {
    win = window;
}

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

function changeWindowOpacity(direction) {
    if (!win || win.isDestroyed()) return;
    if (!_stealth) {
        console.log('⚠️ Opacity control is only available in stealth mode');
        return;
    }

    try {
        const currentOpacity = win.getOpacity();
        const opacityStep = 0.1; // 10% opacity change

        let newOpacity;
        if (direction === 'up') {
            // Page Up: Increase opacity (make more opaque)
            newOpacity = Math.min(1.0, currentOpacity + opacityStep);
        } else if (direction === 'down') {
            // Page Down: Decrease opacity (make more transparent)
            newOpacity = Math.max(0.1, currentOpacity - opacityStep); // minimum 10% opacity
        }

        win.setOpacity(newOpacity);
        console.log(`🔄 Window opacity changed to ${(newOpacity * 100).toFixed(0)}%`);
    } catch (error) {
        console.warn('⚠️ Opacity control not supported on this platform:', error.message);
    }
}

function enableStealth() {
    if (!win || win.isDestroyed()) return;
    try {
        // Ensure window stays always on top in stealth mode
        win.setAlwaysOnTop(true);

        // Ensure the window is transparent (created with transparent:true)
        // Ignore mouse events so clicks pass through the window
        // forward: true ensures underlying windows still receive events
        win.setIgnoreMouseEvents(true, { forward: true });
        // Make window non-focusable so it doesn't capture keyboard events
        win.setFocusable(false);

        // Enable content protection in stealth mode
        win.setContentProtection(true);

        // Start at 50% opacity
        win.setOpacity(0.5);

        _stealth = true;
        console.log('🕵️‍♀️ Stealth mode enabled');
    } catch (err) {
        console.warn('⚠️ enableStealth failed:', err.message);
    }
}

function disableStealth() {
    if (!win || win.isDestroyed()) return;
    try {
        win.setIgnoreMouseEvents(false);

        win.setFocusable(true);

        // Restore previous always-on-top state if we saved one
        win.setAlwaysOnTop(false);

        // Disable content protection when stealth mode is disabled
        win.setContentProtection(false);

        // Restore full opacity
        win.setOpacity(1.0);

        _stealth = false;
        console.log('🟢 Stealth mode disabled');
    } catch (err) {
        console.warn('⚠️ disableStealth failed:', err.message);
    }
}

function toggleStealth() {
    if (_stealth) disableStealth(); else enableStealth();
}

module.exports = {
    setWindowReference,
    moveWindowToCorner,
    toggleMaximize,
    toggleMinimize,
    moveWindowByArrow,
    resizeWindowByArrow,
    changeWindowOpacity,
    enableStealth,
    disableStealth,
    toggleStealth
};