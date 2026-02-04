import { ipcMain } from 'electron';
import { vcamBridgeService } from '../services/vcam-bridge.service.js';

export function registerVcamBridgeHandlers() {
  ipcMain.handle('vcam:start-bridge', async () => {
    await vcamBridgeService.startBridge();
  });

  ipcMain.handle('vcam:stop-bridge', async () => {
    await vcamBridgeService.stopBridge();
  });

  ipcMain.handle('vcam:get-status', async () => {
    return vcamBridgeService.getStatus();
  });
}
