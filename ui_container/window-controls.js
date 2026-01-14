const { screen } = require('electron');

const Store = require('electron-store').default;
const store = new Store();

// Global reference to the main window (will be set from main.js)
let win = null;
let _stealth = !!store.get('_stealth');

// Ensure stealth is disabled by default on load; persist false in store
try {
  store.set('_stealth', false);
  _stealth = false;
} catch (e) {}

// -------------------------------------------------------------
// WINDOW CONTROL FUNCTIONS
// -------------------------------------------------------------
function setWindowReference(window) {
  win = window;
}

function setWindowBounds(bounds) {
  if (!win || win.isDestroyed()) return;
  // Enforce minimum window dimensions and merge with current bounds
  try {
    const MIN_WIDTH = 1024;
    const MIN_HEIGHT = 640;

    // Fill missing values from current bounds
    const current = win.getBounds();
    const newBounds = Object.assign({}, current, bounds || {});

    // Ensure minimums
    if (newBounds.width < MIN_WIDTH) {
      newBounds.width = MIN_WIDTH;
    }
    if (newBounds.height < MIN_HEIGHT) {
      newBounds.height = MIN_HEIGHT;
    }

    win.setBounds(newBounds);
  } catch (err) {
    // Fallback to original behaviour if anything goes wrong
    try {
      win.setBounds(bounds);
    } catch (e) {}
  }
}

function moveWindowToCorner(corner) {
  if (!win || win.isDestroyed()) return;
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const { width: winWidth, height: winHeight } = win.getBounds();

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

  setWindowBounds({ x, y, width: winWidth, height: winHeight });
  console.log(`🔄 Window moved to ${corner}`);
}

function placeWindow(position) {
  // alias for moveWindowToCorner with the same position names
  try {
    moveWindowToCorner(position);
  } catch (e) {
    console.warn('placeWindow failed:', e && e.message ? e.message : e);
  }
}

function moveWindowByArrow(direction) {
  if (!win || win.isDestroyed()) return;

  const bounds = win.getBounds();
  const moveAmount = 20; // pixels to move

  switch (direction) {
    case 'up':
      bounds.y = bounds.y - moveAmount;
      break;
    case 'down':
      bounds.y = bounds.y + moveAmount;
      break;
    case 'left':
      bounds.x = bounds.x - moveAmount;
      break;
    case 'right':
      bounds.x = bounds.x + moveAmount;
      break;
  }

  setWindowBounds(bounds);
  console.log(`🔄 Window moved ${direction} by ${moveAmount}px`);
}

function resizeWindowByArrow(direction) {
  if (!win || win.isDestroyed()) return;

  const bounds = win.getBounds();
  const resizeAmount = 20; // pixels to resize

  switch (direction) {
    case 'up':
      // Decrease height (shrink upward)
      bounds.height = Math.max(200, bounds.height - resizeAmount); // minimum height of 200px
      break;
    case 'down':
      // Increase height (grow downward)
      bounds.height = bounds.height + resizeAmount;
      break;
    case 'left':
      // Decrease width (shrink leftward)
      bounds.width = Math.max(300, bounds.width - resizeAmount); // minimum width of 300px
      break;
    case 'right':
      // Increase width (grow rightward)
      bounds.width = bounds.width + resizeAmount;
      break;
  }

  setWindowBounds(bounds);
  console.log(`🔄 Window resized ${direction} by ${resizeAmount}px`);
}

function enableStealth() {
  if (!win || win.isDestroyed()) return;
  try {
    // Ensure window stays always on top in stealth mode (use highest level)
    try {
      // Use a high z-order level so the overlay remains above other windows
      // 'screen-saver' is typically the highest-level available in Electron
      win.setAlwaysOnTop(true, 'screen-saver');
    } catch (e) {
      // Fallback to basic always-on-top if level not supported
      try {
        win.setAlwaysOnTop(true);
      } catch (e) {}
    }

    // Make the window visible on all workspaces and in fullscreen
    try {
      if (typeof win.setVisibleOnAllWorkspaces === 'function') {
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      }
    } catch (e) {}

    // Ensure the window is transparent (created with transparent:true)
    // Ignore mouse events so clicks pass through the window
    // forward: true ensures underlying windows still receive events
    win.setIgnoreMouseEvents(true, { forward: true });
    // Make window non-focusable so it doesn't capture keyboard events
    win.setFocusable(false);

    // Enable content protection in stealth mode
    win.setContentProtection(true);

    // Make the window semi-transparent
    win.setOpacity(0.85);

    _stealth = true;
    try {
      store.set('_stealth', _stealth);
    } catch (e) {}
    console.log('🕵️‍♀️ Stealth mode enabled');
    try {
      if (win && !win.isDestroyed()) win.webContents.send('stealth-changed', _stealth);
    } catch (e) {}
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
    try {
      store.set('_stealth', _stealth);
    } catch (e) {}
    console.log('🟢 Stealth mode disabled');
    try {
      if (win && !win.isDestroyed()) win.webContents.send('stealth-changed', _stealth);
    } catch (e) {}
  } catch (err) {
    console.warn('⚠️ disableStealth failed:', err.message);
  }
}

function toggleStealth() {
  if (_stealth) disableStealth();
  else enableStealth();
}

function toggleOpacity() {
  if (!win || win.isDestroyed()) return;
  if (!_stealth) {
    console.log('⚠️ Opacity toggle is only available in stealth mode');
    return;
  }

  try {
    const current = win.getOpacity();
    const LOW = 0.2;
    const HIGH = 0.85;

    // If roughly at HIGH, switch to LOW, otherwise switch to HIGH
    const newOpacity = Math.abs(current - HIGH) < 0.05 ? LOW : HIGH;
    win.setOpacity(newOpacity);
    console.log(`🔄 Window opacity toggled to ${(newOpacity * 100).toFixed(0)}%`);
  } catch (err) {
    console.warn('⚠️ Opacity toggle not supported on this platform:', err.message);
  }
}

module.exports = {
  setWindowBounds,
  setWindowReference,
  moveWindowToCorner,
  placeWindow,
  moveWindowByArrow,
  resizeWindowByArrow,
  toggleOpacity,
  enableStealth,
  disableStealth,
  toggleStealth,
};
