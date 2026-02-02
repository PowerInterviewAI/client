/**
 * Window control IPC handlers
 */

import { ipcMain, BrowserWindow } from 'electron';
import * as windowControls from '../window-controls.js';
import { setWindowBounds } from '../window-controls.js';

export function registerWindowHandlers(win: BrowserWindow): void {
  // Minimize window
  ipcMain.on('window-minimize', () => {
    if (win && !win.isDestroyed()) {
      win.minimize();
    }
  });

  // Close window
  ipcMain.on('window-close', () => {
    if (win && !win.isDestroyed()) {
      win.close();
    }
  });

  // Set stealth mode
  ipcMain.on('set-stealth', (_event, isStealth: boolean) => {
    try {
      if (isStealth) {
        windowControls.enableStealth();
      } else {
        windowControls.disableStealth();
      }
    } catch (err) {
      console.warn('set-stealth handler error:', err);
    }
  });

  // Toggle stealth mode
  ipcMain.on('window-toggle-stealth', () => {
    try {
      windowControls.toggleStealth();
    } catch (err) {
      console.warn('window-toggle-stealth handler error:', err);
    }
  });

  // Toggle opacity
  ipcMain.on('window-toggle-opacity', () => {
    try {
      windowControls.toggleOpacity();
    } catch (err) {
      console.warn('window-toggle-opacity handler error:', err);
    }
  });

  // Handle window resize delta (edge dragging)
  ipcMain.on('window-resize-delta', (_event, dx: number, dy: number, edge: string) => {
    try {
      if (!win || win.isDestroyed()) return;

      const minWidth = 300;
      const minHeight = 200;
      const bounds = win.getBounds();
      const nb = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };

      // Only handle right/bottom/bottom-right resizes
      if (edge.includes('right')) {
        nb.width += dx;
      }
      if (edge.includes('bottom')) {
        nb.height += dy;
      }

      // Enforce minimums
      if (nb.width < minWidth) {
        nb.width = minWidth;
      }
      if (nb.height < minHeight) {
        nb.height = minHeight;
      }

      setWindowBounds(nb);
    } catch (err) {
      console.warn('window-resize-delta handler error:', err);
    }
  });
}
