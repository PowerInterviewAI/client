/**
 * Health check IPC handlers (deprecated - for compatibility)
 */

import { ipcMain } from 'electron';
import { ApiClient } from '../api/client.js';
import { AppApi } from '../api/app.js';
import { configManager } from '../config/app.js';

export function registerHealthCheckHandlers(): void {
  // Ping backend
  ipcMain.handle('app:ping', async () => {
    const serverUrl = configManager.get('serverUrl');
    const client = new ApiClient(serverUrl);
    const appApi = new AppApi(client);
    return appApi.ping();
  });

  // Ping client with device info
  ipcMain.handle('app:ping-client', async (_event, deviceInfo) => {
    const serverUrl = configManager.get('serverUrl');
    const client = new ApiClient(serverUrl);
    const appApi = new AppApi(client);
    return appApi.pingClient(deviceInfo);
  });

  // Ping GPU server
  ipcMain.handle('app:ping-gpu-server', async () => {
    const serverUrl = configManager.get('serverUrl');
    const client = new ApiClient(serverUrl);
    const appApi = new AppApi(client);
    return appApi.pingGpuServer();
  });

  // Wake up GPU server
  ipcMain.handle('app:wakeup-gpu-server', async () => {
    const serverUrl = configManager.get('serverUrl');
    const client = new ApiClient(serverUrl);
    const appApi = new AppApi(client);
    return appApi.wakeupGpuServer();
  });
}
