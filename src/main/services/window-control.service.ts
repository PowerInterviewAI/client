import { BrowserWindow, screen } from 'electron';

import { MIN_HEIGHT, MIN_WIDTH, OPACITY_LEVELS } from '../consts.js';
import { configStore } from '../store/config.store.js';
import { appStateService } from './app-state.service.js';
import { pushNotificationService } from './push-notification.service.js';

// Global reference to the main window
let win: BrowserWindow | null = null;
let _stealth = configStore.getStealth();

// helper: return the display the window mostly occupies (fallback to primary)
function getCurrentDisplay(): Electron.Display {
  if (win && !win.isDestroyed()) {
    try {
      const b = win.getBounds();
      const d = screen.getDisplayMatching(b);
      if (d) return d;
    } catch {
      // fall through
    }
  }
  return screen.getPrimaryDisplay();
}

// Ensure stealth is disabled by default on load
try {
  configStore.setStealth(false);
  _stealth = false;
} catch (e) {
  console.warn('Failed to reset stealth state:', e);
}

export type WindowPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type ResizeDirection = 'up' | 'down' | 'left' | 'right';

interface WindowBounds {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

/**
 * Set the window reference for all control functions
 */
export function setWindowReference(window: BrowserWindow): void {
  win = window;

  // The shell re-adds the taskbar button whenever the window is re-shown or re-shaped, and most
  // of those paths are not ours to intercept - Alt+Tab restoring a minimized window, for one.
  // Re-assert on the events instead of at every call site.
  if (typeof window.on === 'function') {
    window.on('show', hideFromTaskbar);
    window.on('restore', hideFromTaskbar);
    window.on('maximize', hideFromTaskbar);
    window.on('unmaximize', hideFromTaskbar);
  }
}

/**
 * Retrieve the current main BrowserWindow reference (may be null)
 */
export function getWindowReference(): BrowserWindow | null {
  return win;
}

/**
 * Re-assert that the window stays out of the taskbar.
 *
 * The constructor option is not sticky: hiding the button is registration state
 * (`ITaskbarList::DeleteTab` on Windows), not a window style, and the shell re-adds the button
 * when the window's styles change underneath it - which is exactly what toggling stealth does
 * through `setFocusable` and the z-order level. Anything that reshapes or re-shows the window
 * has to call this afterwards.
 */
function hideFromTaskbar(): void {
  if (!win || win.isDestroyed()) return;

  try {
    win.setSkipTaskbar(true);
  } catch (e) {
    console.warn('setSkipTaskbar failed:', e);
  }
}

/**
 * Restore and raise the window.
 * There is no taskbar button and no Dock icon to click, so a minimized window is
 * only reachable through this.
 */
export function restoreWindow(): void {
  if (!win || win.isDestroyed()) return;

  try {
    if (win.isMinimized()) win.restore();

    // In stealth mode the window is click-through and non-focusable, and `show()` activates the
    // app on macOS. Pulling focus out of the call the user is in is the one thing it must not do.
    if (_stealth) {
      if (!win.isVisible()) win.showInactive();
      hideFromTaskbar();
      return;
    }

    // `show()` also raises and activates, which an accessory app on macOS needs - `focus()`
    // alone does not bring it forward there.
    win.show();
    win.focus();
    // Restoring from minimized re-registers the window with the shell.
    hideFromTaskbar();
  } catch (err) {
    console.warn('⚠️ restoreWindow failed:', err);
  }
}

/**
 * Set window bounds with minimum size enforcement
 */
export function setWindowBounds(bounds: Partial<WindowBounds>): void {
  if (!win || win.isDestroyed()) return;

  // Fill missing values from current bounds
  // Ensure minimums
  if (bounds.width !== undefined && bounds.width < MIN_WIDTH) {
    bounds.width = MIN_WIDTH;
  }
  if (bounds.height !== undefined && bounds.height < MIN_HEIGHT) {
    bounds.height = MIN_HEIGHT;
  }

  win.setBounds(bounds);
}

/**
 * Move window to a specific corner or position
 */
export function moveWindowToCorner(corner: WindowPosition): void {
  if (!win || win.isDestroyed()) return;

  // use the display the window currently occupies; this matches the
  // user's request to operate on the screen where the window is placed.
  const display = getCurrentDisplay();
  const { width: screenWidth, height: screenHeight } = display.workAreaSize;
  const { width: winWidth, height: winHeight } = win.getBounds();
  const { x: displayX, y: displayY } = display.bounds;

  let x = 0,
    y = 0;

  // Support 9 positions: top-left, top-center, top-right,
  // middle-left, center, middle-right,
  // bottom-left, bottom-center, bottom-right
  switch (corner) {
    case 'top-left':
      x = 0;
      y = 0;
      break;
    case 'top-center':
      x = Math.floor((screenWidth - winWidth) / 2);
      y = 0;
      break;
    case 'top-right':
      x = screenWidth - winWidth;
      y = 0;
      break;
    case 'middle-left':
      x = 0;
      y = Math.floor((screenHeight - winHeight) / 2);
      break;
    case 'center':
      x = Math.floor((screenWidth - winWidth) / 2);
      y = Math.floor((screenHeight - winHeight) / 2);
      break;
    case 'middle-right':
      x = screenWidth - winWidth;
      y = Math.floor((screenHeight - winHeight) / 2);
      break;
    case 'bottom-left':
      x = 0;
      y = screenHeight - winHeight;
      break;
    case 'bottom-center':
      x = Math.floor((screenWidth - winWidth) / 2);
      y = screenHeight - winHeight;
      break;
    case 'bottom-right':
      x = screenWidth - winWidth;
      y = screenHeight - winHeight;
      break;
    default:
      // Fallback to center for unknown positions
      x = Math.floor((screenWidth - winWidth) / 2);
      y = Math.floor((screenHeight - winHeight) / 2);
  }

  setWindowBounds({ x: x + displayX, y: y + displayY });
  console.log(`🔄 Window moved to ${corner}`);
}

/**
 * Alias for moveWindowToCorner
 */
export function placeWindow(position: WindowPosition): void {
  try {
    moveWindowToCorner(position);
  } catch (e) {
    console.warn('placeWindow failed:', e);
  }
}

/**
 * Move window by arrow direction (small step)
 */
export function moveWindowByArrow(direction: ResizeDirection): void {
  if (!win || win.isDestroyed()) return;

  const bounds = win.getBounds();
  // pixels to move
  const moveAmount = 20;

  const updated: Partial<WindowBounds> = {};
  switch (direction) {
    case 'up':
      updated.y = bounds.y - moveAmount;
      break;
    case 'down':
      updated.y = bounds.y + moveAmount;
      break;
    case 'left':
      updated.x = bounds.x - moveAmount;
      break;
    case 'right':
      updated.x = bounds.x + moveAmount;
      break;
  }

  setWindowBounds(updated);
  console.log(`🔄 Window moved ${direction} by ${moveAmount}px`);
}

/**
 * Resize window by arrow direction
 */
export function resizeWindowByArrow(direction: ResizeDirection): void {
  if (!win || win.isDestroyed()) return;

  const bounds = win.getBounds();
  // pixels to resize
  const resizeAmount = 20;

  const updated: Partial<WindowBounds> = {};
  switch (direction) {
    case 'up':
      // Decrease height (shrink upward)
      updated.height = Math.max(MIN_HEIGHT, bounds.height - resizeAmount);
      break;
    case 'down':
      // Increase height (grow downward)
      updated.height = bounds.height + resizeAmount;
      break;
    case 'left':
      // Decrease width (shrink leftward)
      updated.width = Math.max(MIN_WIDTH, bounds.width - resizeAmount);
      break;
    case 'right':
      // Increase width (grow rightward)
      updated.width = bounds.width + resizeAmount;
      break;
  }

  setWindowBounds(updated);
  console.log(`🔄 Window resized ${direction} by ${resizeAmount}px`);
}

/**
 * Enable stealth mode (transparent, click-through, always on top)
 */
export function enableStealth(): void {
  if (!win || win.isDestroyed()) return;

  try {
    // Ensure window stays always on top in stealth mode (use highest level)
    try {
      // Use a high z-order level so the overlay remains above other windows
      win.setAlwaysOnTop(true, 'screen-saver');
    } catch (e) {
      console.warn('setAlwaysOnTop with level failed:', e);
      // Fallback to basic always-on-top if level not supported
      try {
        win.setAlwaysOnTop(true);
      } catch (e) {
        console.warn('setAlwaysOnTop failed:', e);
      }
    }

    // Make the window visible on all workspaces and in fullscreen
    try {
      if (typeof win.setVisibleOnAllWorkspaces === 'function') {
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      }
    } catch (e) {
      console.warn('setVisibleOnAllWorkspaces failed:', e);
    }

    // Ignore mouse events so clicks pass through the window
    // forward: true ensures underlying windows still receive events
    win.setIgnoreMouseEvents(true, { forward: true });

    // Make window non-focusable so it doesn't capture keyboard events
    win.setFocusable(false);

    // Make the window semi-transparent using last-used opacity level
    win.setOpacity(configStore.getOpacityLevel());

    // Same reason as on the way out: setFocusable(false) can hand the button back.
    hideFromTaskbar();

    _stealth = true;
    try {
      configStore.setStealth(_stealth);
    } catch (e) {
      console.warn('Failed to save stealth state:', e);
    }

    console.log('Stealth mode enabled');

    try {
      if (win && !win.isDestroyed()) {
        win.webContents.send('window:stealth-changed', _stealth);
      }
    } catch (e) {
      console.warn('Failed to send window:stealth-changed event:', e);
    }
  } catch (err) {
    console.warn('⚠️ enableStealth failed:', err);
  }
}

/**
 * Disable stealth mode (restore normal window behavior)
 */
export function disableStealth(): void {
  if (!win || win.isDestroyed()) return;

  try {
    win.setIgnoreMouseEvents(false);
    win.setFocusable(true);

    // Restore previous always-on-top state
    win.setAlwaysOnTop(false);

    _stealth = false;

    // Restore full opacity
    win.setOpacity(1.0);

    // Last, after every other window mutation: setFocusable, the z-order change and dropping
    // the layered style all hand the taskbar button back.
    hideFromTaskbar();

    try {
      configStore.setStealth(_stealth);
    } catch (e) {
      console.warn('Failed to save stealth state:', e);
    }

    console.log('Stealth mode disabled');

    try {
      if (win && !win.isDestroyed()) {
        win.webContents.send('window:stealth-changed', _stealth);
      }
    } catch (e) {
      console.warn('Failed to send window:stealth-changed event:', e);
    }
  } catch (err) {
    console.warn('⚠️ disableStealth failed:', err);
  }
}

/**
 * Toggle stealth mode on/off
 */
export function toggleStealth(): void {
  // Check if user is logged in
  if (!appStateService.getState().isLoggedIn) {
    pushNotificationService.pushNotification({
      message: 'You must be logged in to use stealth mode.',
      type: 'error',
    });
    console.log('⚠️ Stealth mode requires authentication');
    return;
  }

  if (_stealth) {
    disableStealth();
  } else {
    enableStealth();
  }
}

/**
 * Toggle opacity between high and low (only in stealth mode)
 */
export function toggleOpacity(): void {
  if (!win || win.isDestroyed()) return;

  if (!_stealth) {
    pushNotificationService.pushNotification({
      message: 'Opacity toggle is only available in stealth mode.',
      type: 'warning',
    });
    console.log('⚠️ Opacity toggle is only available in stealth mode');
    return;
  }

  try {
    const current = win.getOpacity();
    const tolerance = 0.05;

    const currentIndex = OPACITY_LEVELS.findIndex(
      (level) => Math.abs(current - level) <= tolerance
    );
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % OPACITY_LEVELS.length : 0;
    const newOpacity = OPACITY_LEVELS[nextIndex];

    win.setOpacity(newOpacity);
    configStore.saveOpacityLevel(newOpacity);
    console.log(`🔄 Window opacity toggled to ${(newOpacity * 100).toFixed(0)}%`);
  } catch (err) {
    console.warn('⚠️ Opacity toggle not supported on this platform:', err);
  }
}
