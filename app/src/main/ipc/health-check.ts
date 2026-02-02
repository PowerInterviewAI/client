/**
 * Health check IPC handlers (deprecated - for compatibility)
 */

import { ipcMain } from 'electron';
import { HealthCheckApi } from '../api/health-check.js';
import { configManager } from '../config/app.js';

export function registerHealthCheckHandlers(): void {
  // Ping backend
  ipcMain.handle('app:ping', async () => {
    const serverUrl = configManager.get('serverUrl');
    const healthCheckApi = new HealthCheckApi(serverUrl);
    return healthCheckApi.ping();
  });

  // Ping client with device info
  ipcMain.handle('app:ping-client', async (_event, deviceInfo) => {
    const serverUrl = configManager.get('serverUrl');
    const healthCheckApi = new HealthCheckApi(serverUrl);
    return healthCheckApi.pingClient(deviceInfo);
  });

  // Ping GPU server
  ipcMain.handle('app:ping-gpu-server', async () => {
    const serverUrl = configManager.get('serverUrl');
    const healthCheckApi = new HealthCheckApi(serverUrl);
    return healthCheckApi.pingGpuServer();
  });

  // Wake up GPU server
  ipcMain.handle('app:wakeup-gpu-server', async () => {
    const serverUrl = configManager.get('serverUrl');
    const healthCheckApi = new HealthCheckApi(serverUrl);
    return healthCheckApi.wakeupGpuServer();
  });
}
