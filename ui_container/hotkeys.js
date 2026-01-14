const { BrowserWindow } = require('electron');
const { globalShortcut } = require('electron');

// Import window control functions
const {
  moveWindowToCorner,
  moveWindowByArrow,
  resizeWindowByArrow,
  toggleOpacity,
  toggleStealth,
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

  // Stealth mode toggle — Ctrl+Alt+Shift+Q
  globalShortcut.register('Control+Alt+Shift+Q', () => toggleStealth());

  // Opacity toggle (Ctrl+Alt+Shift+W): toggle opacity when in stealth mode
  globalShortcut.register('Control+Alt+Shift+W', () => toggleOpacity());

  // Window positioning hotkeys (Win+Ctrl+1-9)
  // Map numpad-style positions: 7 8 9
  //                             4 5 6
  //                             1 2 3
  const numToCorner = n => {
    switch (String(n)) {
      case '1':
        return 'bottom-left';
      case '2':
        return 'bottom-center';
      case '3':
        return 'bottom-right';
      case '4':
        return 'middle-left';
      case '5':
        return 'center';
      case '6':
        return 'middle-right';
      case '7':
        return 'top-left';
      case '8':
        return 'top-center';
      case '9':
        return 'top-right';
      default:
        return 'center';
    }
  };
  for (let i = 1; i <= 9; i++) {
    // Register Ctrl+Alt+Shift+1..9 for placement (match ui/lib/hotkeys.ts)
    globalShortcut.register(`Control+Alt+Shift+${i}`, () => {
      const pos = numToCorner(i);
      moveWindowToCorner(pos);
    });
  }

  // Arrow key movement hotkeys (Win+Ctrl+ArrowKeys)
  // Movement: Ctrl+Alt+Shift+Arrow
  globalShortcut.register('Control+Alt+Shift+Up', () => moveWindowByArrow('up'));
  globalShortcut.register('Control+Alt+Shift+Down', () => moveWindowByArrow('down'));
  globalShortcut.register('Control+Alt+Shift+Left', () => moveWindowByArrow('left'));
  globalShortcut.register('Control+Alt+Shift+Right', () => moveWindowByArrow('right'));

  // Arrow key resize hotkeys (Win+Ctrl+Shift+ArrowKeys)
  // Resize presets / actions: Ctrl+Alt+Shift+F1-F4
  // Map F9..F12 to simple preset resizes implemented in window-controls
  const { resizeWindowPreset } = require('./window-controls');
  globalShortcut.register('Control+Alt+Shift+F9', () => resizeWindowByArrow('left'));
  globalShortcut.register('Control+Alt+Shift+F10', () => resizeWindowByArrow('right'));
  globalShortcut.register('Control+Alt+Shift+F11', () => resizeWindowByArrow('up'));
  globalShortcut.register('Control+Alt+Shift+F12', () => resizeWindowByArrow('down'));

  // Send scroll events to renderer for suggestions/code scrolling
  // Interview suggestions: Ctrl+Alt+Shift+U (up) / Ctrl+Alt+Shift+J (down)
  globalShortcut.register('Control+Alt+Shift+U', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-scroll', 'up');
  });
  globalShortcut.register('Control+Alt+Shift+J', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-scroll', 'down');
  });
  // Code suggestions: Ctrl+Alt+Shift+I (up) / Ctrl+Alt+Shift+K (down)
  globalShortcut.register('Control+Alt+Shift+I', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-scroll', 'up');
  });
  globalShortcut.register('Control+Alt+Shift+K', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-scroll', 'down');
  });

  // Additional renderer actions: Capture screenshot, set prompt, submit
  // These send action events to the renderer; UI can wire handlers via ipc if needed.
  globalShortcut.register('Control+Alt+Shift+S', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-action', 'capture-screenshot');
  });
  globalShortcut.register('Control+Alt+Shift+P', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-action', 'set-prompt');
  });
  globalShortcut.register('Control+Alt+Shift+Enter', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-action', 'submit');
  });

  console.log('🎹 Global hotkeys registered:');
  console.log('  Ctrl+Alt+Shift+1-9: Place window (numpad layout)');
  console.log('  Ctrl+Alt+Shift+Arrow: Move window');
  console.log('  Ctrl+Alt+Shift+F9-F12: Resize window');
  console.log('  Ctrl+Alt+Shift+Q: Toggle stealth mode');
  console.log('  Ctrl+Alt+Shift+W: Toggle opacity (stealth only)');
  console.log('  Ctrl+Alt+Shift+U / J: Scroll interview suggestions');
  console.log('  Ctrl+Alt+Shift+I / K: Scroll code suggestions');
  console.log('  Ctrl+Alt+Shift+S: Capture screenshot (renderer action)');
  console.log('  Ctrl+Alt+Shift+P: Set prompt (renderer action)');
  console.log('  Ctrl+Alt+Shift+Enter: Submit (renderer action)');
}

function unregisterHotkeys() {
  globalShortcut.unregisterAll();
}

module.exports = {
  registerGlobalHotkeys,
  unregisterHotkeys,
};
