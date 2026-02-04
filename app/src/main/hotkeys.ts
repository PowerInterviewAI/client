import { BrowserWindow, globalShortcut } from 'electron';
import {
  moveWindowToCorner,
  moveWindowByArrow,
  resizeWindowByArrow,
  toggleOpacity,
  toggleStealth,
  WindowPosition,
} from './services/window-control-service.js';
import { codeSuggestionService } from './services/code-suggestion.service.js';

/**
 * Register global hotkeys for window management and navigation
 */
export function registerGlobalHotkeys(): void {
  // Unregister existing hotkeys first
  globalShortcut.unregisterAll();

  // Stealth mode toggle — Ctrl+Shift+Q
  globalShortcut.register('Control+Shift+Q', () => toggleStealth());

  // Opacity toggle (Ctrl+Shift+D): toggle opacity when in stealth mode
  globalShortcut.register('Control+Shift+D', () => toggleOpacity());

  // Window positioning hotkeys (Ctrl+Shift+1-9)
  // Map numpad-style positions: 7 8 9
  //                             4 5 6
  //                             1 2 3
  const numToCorner = (n: number): WindowPosition => {
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
    // Register Ctrl+Shift+1..9 for placement
    globalShortcut.register(`Control+Shift+${i}`, () => {
      const pos = numToCorner(i);
      moveWindowToCorner(pos);
    });
  }

  // Window movement hotkeys: Ctrl+Alt+Shift+Arrow
  globalShortcut.register('Control+Alt+Shift+Up', () => moveWindowByArrow('up'));
  globalShortcut.register('Control+Alt+Shift+Down', () => moveWindowByArrow('down'));
  globalShortcut.register('Control+Alt+Shift+Left', () => moveWindowByArrow('left'));
  globalShortcut.register('Control+Alt+Shift+Right', () => moveWindowByArrow('right'));

  // Resize window hotkeys: Ctrl+Win+Shift+Arrow (Super = Windows key)
  globalShortcut.register('Control+Super+Shift+Up', () => resizeWindowByArrow('up'));
  globalShortcut.register('Control+Super+Shift+Down', () => resizeWindowByArrow('down'));
  globalShortcut.register('Control+Super+Shift+Right', () => resizeWindowByArrow('right'));
  globalShortcut.register('Control+Super+Shift+Left', () => resizeWindowByArrow('left'));

  // Scroll reply suggestions: Ctrl+Shift+K (up) / Ctrl+Shift+J (down)
  globalShortcut.register('Control+Shift+K', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) {
      w.webContents.send('hotkey-scroll', '0', 'up');
    }
  });
  globalShortcut.register('Control+Shift+J', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) {
      w.webContents.send('hotkey-scroll', '0', 'down');
    }
  });

  // Scroll code suggestions: Ctrl+Shift+I (up) / Ctrl+Shift+U (down)
  globalShortcut.register('Control+Shift+I', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) {
      w.webContents.send('hotkey-scroll', '1', 'up');
    }
  });
  globalShortcut.register('Control+Shift+U', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w && !w.isDestroyed()) {
      w.webContents.send('hotkey-scroll', '1', 'down');
    }
  });

  // Code suggestion operations: Ctrl+Alt+Shift+S (screenshot), X (clear), Enter (submit)
  globalShortcut.register('Control+Alt+Shift+S', async () => {
    await codeSuggestionService.captureScreenshot();
  });
  globalShortcut.register('Control+Alt+Shift+X', () => {
    codeSuggestionService.clearImages();
  });
  globalShortcut.register('Control+Alt+Shift+Enter', async () => {
    await codeSuggestionService.startGenerateSuggestion();
  });

  console.log('🎹 Global hotkeys registered:');
  console.log('  Ctrl+Shift+Q: Toggle stealth mode');
  console.log('  Ctrl+Shift+D: Toggle opacity (stealth only)');
  console.log('  Ctrl+Shift+1-9: Place window (numpad layout)');
  console.log('  Ctrl+Alt+Shift+Arrow: Move window');
  console.log('  Ctrl+Win+Shift+Arrow: Resize window');
  console.log('  Ctrl+Shift+J / K: Scroll interview suggestions (J down, K up)');
  console.log('  Ctrl+Shift+U / I: Scroll code suggestions (U down, I up)');
  console.log('  Ctrl+Alt+Shift+S: Capture screenshot (renderer action)');
  console.log('  Ctrl+Alt+Shift+X: Clear screenshots (renderer action)');
  console.log('  Ctrl+Alt+Shift+Enter: Submit (renderer action)');
}

/**
 * Unregister all global hotkeys
 */
export function unregisterHotkeys(): void {
  globalShortcut.unregisterAll();
}
