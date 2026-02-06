import { ipcMain } from 'electron';

import { webRtcService } from '../services/webrtc.service.js';

export function registerWebRTCHandlers() {
  ipcMain.handle('webrtc:offer', async (_event, offer) => {
    await webRtcService.offer(offer);
  });

  ipcMain.handle('webrtc:start-agents', async () => {
    await webRtcService.startAgents();
  });

  ipcMain.handle('webrtc:stop-agents', async () => {
    await webRtcService.stopAgents();
  });

  ipcMain.handle('webrtc:put-video-frame', async (_event, frameData: ArrayBuffer) => {
    await webRtcService.putVideoFrame(frameData);
  });
}
