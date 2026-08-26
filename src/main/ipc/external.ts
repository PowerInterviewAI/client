import { ipcMain, shell } from 'electron';

import { openExternally } from '../navigation-guard.js';

export function registerExternalHandlers(): void {
  // Shared with the window-open handler rather than calling shell.openExternal directly, so a
  // link takes the same route and the same scheme check whichever way it arrives. openExternal
  // hands the URL to the OS protocol handler, so `file:` launches what the path points at.
  ipcMain.handle('external:open', async (_event, url: string) => openExternally(url));

  ipcMain.handle('external:open-file', async (_event, filePath: string) => {
    const err = await shell.openPath(filePath);
    return err ? { success: false, error: err } : { success: true };
  });

  ipcMain.handle('external:show-in-folder', (_event, filePath: string) => {
    shell.showItemInFolder(filePath);
  });
}
