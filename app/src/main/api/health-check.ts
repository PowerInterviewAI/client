/**
 * Health Check API
 */

import { ApiClient, ApiResponse } from './client.js';

export class HealthCheckApi {
  constructor(private client: ApiClient) {}

  /**
   * Health check / ping
   */
  async ping(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.client.get('/ping');
  }

  /**
   * Ping client to backend with device info
   */
  async pingClient(deviceInfo: {
    device_id: string;
    is_gpu_alive: boolean;
    is_assistant_running: boolean;
  }): Promise<ApiResponse<{ status: string }>> {
    return this.client.post('/ping-client', deviceInfo);
  }

  /**
   * Ping GPU server
   */
  async pingGpuServer(): Promise<ApiResponse<{ status: string; alive: boolean }>> {
    return this.client.get('/ping-gpu-server');
  }

  /**
   * Wake up GPU server
   */
  async wakeupGpuServer(): Promise<ApiResponse<{ status: string }>> {
    return this.client.post('/wakeup-gpu-server', {});
  }

  /**
   * Get app version
   */
  async getVersion(): Promise<ApiResponse<{ version: string }>> {
    return this.client.get('/app/version');
  }
}
