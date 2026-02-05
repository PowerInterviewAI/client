import { ipcMain } from 'electron';

import { vcamBridgeService } from '../services/vcam-bridge.service.js';

export function registerVcamBridgeHandlers() {
  ipcMain.handle('vcam-bridge:start', async () => {
    await vcamBridgeService.start();
  });

  ipcMain.handle('vcam-bridge:stop', async () => {
    await vcamBridgeService.stop();
  });
}
