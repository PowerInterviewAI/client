import { ipcMain } from 'electron';

import { autoUpdaterService } from '../services/auto-updater.service.js';
import { allowNextClose, rearmCloseGuard } from '../window-close-guard.js';

export function registerAutoUpdaterHandlers(): void {
  ipcMain.handle('auto-updater:check-for-updates', async () => {
    try {
      await autoUpdaterService.checkForUpdates();
      return { success: true };
    } catch (error) {
      console.error('[IPC] Failed to check for updates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('auto-updater:quit-and-install', async () => {
    // Armed before the call rather than after it: the installer is launched and the quit
    // requested inside quitAndInstall, so a guard still active at that moment vetoes a quit the
    // update has already committed to. The renderer asks about an unsaved interview before it
    // invokes this.
    allowNextClose();
    try {
      const quitting = await autoUpdaterService.quitAndInstall();
      // Nothing was launched, so the app is staying and the guard goes back on.
      if (!quitting) rearmCloseGuard();
      return { success: quitting };
    } catch (error) {
      console.error('[IPC] Failed to quit and install:', error);
      rearmCloseGuard();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('auto-updater:get-version', () => {
    try {
      return {
        success: true,
        version: autoUpdaterService.getCurrentVersion(),
      };
    } catch (error) {
      console.error('[IPC] Failed to get version:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
