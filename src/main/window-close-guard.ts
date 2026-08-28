import { app, BrowserWindow, ipcMain } from 'electron';

import { appStateService } from './services/app-state.service.js';
import { getWindowReference } from './services/window-control.service.js';

/**
 * Hold the window open long enough to ask whether the interview should be saved.
 *
 * Clear and Start are renderer-initiated and can ask before they act. Closing cannot: the
 * decision is taken in main, by the OS close button, Cmd+Q or `app.quit()`, and by the time the
 * renderer hears about it the answer would arrive too late to matter. So the close is vetoed,
 * the renderer is asked, and it closes the window itself once the user has answered.
 *
 * The transcript and the suggestions live only in main-process memory - nothing is written to
 * disk until an export - so a close taken at face value is the one path in this app that
 * destroys an interview with no way back.
 */

// The user has answered and the next close is theirs. Set immediately before we ask for it.
let closeConfirmed = false;

// A prompt is already on screen. A second close - the window button while the dialog is up, or
// a quit arriving behind it - must not stack another one on top of it.
let prompting = false;

// A quit is in flight. Vetoing the close aborts it, so confirming has to restart it rather than
// close the window, or Cmd+Q would leave a quitting app sitting there with one window less.
let quitting = false;

export function installCloseGuard(win: BrowserWindow): void {
  win.on('close', (event) => {
    if (closeConfirmed || !appStateService.getState().hasHistory) return;

    // Nobody to ask. A renderer that has crashed or is already torn down would swallow the
    // prompt, and a window that cannot be closed is worse than one that closes unasked.
    const wc = win.webContents;
    if (wc.isDestroyed() || wc.isCrashed()) return;

    event.preventDefault();
    if (prompting) return;

    prompting = true;
    wc.send('app:save-history-prompt');
  });
}

export function registerCloseGuardHandlers(): void {
  app.on('before-quit', () => {
    quitting = true;
  });

  ipcMain.on('window:close-confirmed', () => {
    prompting = false;
    closeConfirmed = true;

    // `app.quit()` rather than `win.close()` when a quit was already under way: the veto
    // cancelled it, and closing the window alone would leave `will-quit` unrun on macOS, where
    // the app can outlive its windows.
    if (quitting) {
      app.quit();
      return;
    }

    const win = getWindowReference();
    if (win && !win.isDestroyed()) win.close();
  });

  ipcMain.on('window:close-cancelled', () => {
    prompting = false;
    // Reset, or the next Cmd+Q would take the quit branch above and quit a session the user
    // has just chosen to keep.
    quitting = false;
  });
}
