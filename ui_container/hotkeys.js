const { globalShortcut } = require("electron");

// Import window control functions
const {
    moveWindowToCorner,
    toggleMaximize,
    toggleMinimize,
    moveWindowByArrow,
    resizeWindowByArrow,
    changeWindowOpacity
} = require('./window-controls');

// -------------------------------------------------------------
// REGISTER GLOBAL HOTKEYS
// -------------------------------------------------------------
// registerGlobalHotkeys accepts an optional overrides object so callers
// (like `main.js`) can provide platform-specific or main-process handlers
// such as a custom `toggleStealth` that recreates the BrowserWindow.
function registerGlobalHotkeys(overrides = {}) {
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
        const { BrowserWindow } = require("electron");
        const win = BrowserWindow.getAllWindows()[0]; // Get the main window
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

    // Page key opacity hotkeys (with Ctrl+Shift modifier)
    globalShortcut.register('CommandOrControl+Shift+PageUp', () => changeWindowOpacity('up'));
    globalShortcut.register('CommandOrControl+Shift+PageDown', () => changeWindowOpacity('down'));

    // Send scroll events to renderer for transcript scrolling
    // Use Ctrl+Alt+PageUp/PageDown to avoid colliding with Ctrl+Shift+PageUp/PageDown
    const { BrowserWindow } = require('electron');
    globalShortcut.register('CommandOrControl+Alt+PageUp', () => {
        const w = BrowserWindow.getAllWindows()[0];
        if (w && !w.isDestroyed()) w.webContents.send('hotkey-scroll', 'up');
    });
    globalShortcut.register('CommandOrControl+Alt+PageDown', () => {
        const w = BrowserWindow.getAllWindows()[0];
        if (w && !w.isDestroyed()) w.webContents.send('hotkey-scroll', 'down');
    });

    // Stealth mode toggle — use override if provided, otherwise fallback
    const fallbackToggle = (() => {
        try { return require('./window-controls').toggleStealth; } catch (e) { return null; }
    })();
    const toggleHandler = overrides.toggleStealth || fallbackToggle;
    if (typeof toggleHandler === 'function') {
        globalShortcut.register('CommandOrControl+Alt+S', () => {
            try {
                toggleHandler();
            } catch (e) {
                console.warn('Failed to toggle stealth:', e.message);
            }
        });
    }

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
    console.log('  Ctrl+Alt+PageUp: Scroll suggestions up');
    console.log('  Ctrl+Alt+PageDown: Scroll suggestions down');
    console.log('  Ctrl+Shift+↑: Decrease window height');
    console.log('  Ctrl+Shift+↓: Increase window height');
    console.log('  Ctrl+Shift+←: Decrease window width');
    console.log('  Ctrl+Shift+→: Increase window width');
    console.log('  Ctrl+Shift+PageUp: Increase opacity');
    console.log('  Ctrl+Shift+PageDown: Decrease opacity');
    console.log('  Ctrl+Alt+S: Toggle stealth mode (click-through, non-focusable)');
}

function unregisterHotkeys() {
    globalShortcut.unregisterAll();
}

module.exports = {
    registerGlobalHotkeys,
    unregisterHotkeys
};