/**
 * Health check IPC handlers (deprecated - for compatibility)
 */

import { ipcMain } from 'electron';
import { HealthCheckApi } from '../api/health-check.js';

export function registerHealthCheckHandlers(): void {
  // Ping backend
  ipcMain.handle('app:ping', async () => {
    const healthCheckApi = new HealthCheckApi();
    return healthCheckApi.ping();
  });

  // Ping client with device info
  ipcMain.handle('app:ping-client', async (_event, deviceInfo) => {
    const healthCheckApi = new HealthCheckApi();
    return healthCheckApi.pingClient(deviceInfo);
  });

  // Ping GPU server
  ipcMain.handle('app:ping-gpu-server', async () => {
    const healthCheckApi = new HealthCheckApi();
    return healthCheckApi.pingGpuServer();
  });

  // Wake up GPU server
  ipcMain.handle('app:wakeup-gpu-server', async () => {
    const healthCheckApi = new HealthCheckApi();
    return healthCheckApi.wakeupGpuServer();
  });
}
