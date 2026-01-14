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

  // Stealth mode toggle — Win+Shift+Q
  globalShortcut.register('Super+Shift+Q', () => toggleStealth());

  // Opacity toggle (Win+Shift+W): toggle opacity when in stealth mode
  globalShortcut.register('Super+Shift+W', () => toggleOpacity());

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
    globalShortcut.register(`Super+Control+${i}`, () => {
      const pos = numToCorner(i);
      // Place window at the requested 9-position grid
      moveWindowToCorner(pos);
    });
  }

  // Arrow key movement hotkeys (Win+Ctrl+ArrowKeys)
  globalShortcut.register('Super+Control+Up', () => moveWindowByArrow('up'));
  globalShortcut.register('Super+Control+Down', () => moveWindowByArrow('down'));
  globalShortcut.register('Super+Control+Left', () => moveWindowByArrow('left'));
  globalShortcut.register('Super+Control+Right', () => moveWindowByArrow('right'));

  // Arrow key resize hotkeys (Win+Ctrl+Shift+ArrowKeys)
  globalShortcut.register('Super+Control+Shift+Up', () => resizeWindowByArrow('up'));
  globalShortcut.register('Super+Control+Shift+Down', () => resizeWindowByArrow('down'));
  globalShortcut.register('Super+Control+Shift+Left', () => resizeWindowByArrow('left'));
  globalShortcut.register('Super+Control+Shift+Right', () => resizeWindowByArrow('right'));

  // Send scroll events to renderer for suggestions/code scrolling
  // Interview suggestions: Ctrl+Shift+U (up) / Ctrl+Shift+J (down)
  globalShortcut.register('Control+Shift+U', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-scroll', 'up');
  });
  globalShortcut.register('Control+Shift+J', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-scroll', 'down');
  });
  // Code suggestions: Ctrl+Shift+I (up) / Ctrl+Shift+K (down)
  globalShortcut.register('Control+Shift+I', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-scroll', 'up');
  });
  globalShortcut.register('Control+Shift+K', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-scroll', 'down');
  });

  // Additional renderer actions: Capture screenshot, set prompt, submit
  // These send action events to the renderer; UI can wire handlers via ipc if needed.
  globalShortcut.register('Control+Shift+S', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-action', 'capture-screenshot');
  });
  globalShortcut.register('Control+Shift+P', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-action', 'set-prompt');
  });
  globalShortcut.register('Control+Shift+Enter', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) w.webContents.send('hotkey-action', 'submit');
  });

  console.log('🎹 Global hotkeys registered:');
  console.log('  Win+Ctrl+1-9: Place window (numpad layout)');
  console.log('  Win+Ctrl+Arrow: Move window');
  console.log('  Win+Ctrl+Shift+Arrow: Resize window');
  console.log('  Win+Shift+Q: Toggle stealth mode');
  console.log('  Win+Shift+W: Toggle opacity (stealth only)');
  console.log('  Ctrl+Shift+U / J: Scroll interview suggestions');
  console.log('  Ctrl+Shift+I / K: Scroll code suggestions');
  console.log('  Ctrl+Shift+S: Capture screenshot (renderer action)');
  console.log('  Ctrl+Shift+P: Set prompt (renderer action)');
  console.log('  Ctrl+Shift+Enter: Submit (renderer action)');
}

function unregisterHotkeys() {
  globalShortcut.unregisterAll();
}

module.exports = {
  registerGlobalHotkeys,
  unregisterHotkeys,
};
