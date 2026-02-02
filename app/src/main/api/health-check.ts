/**
 * Health Check API
 */

import { ApiClient, ApiResponse } from './client.js';

export class HealthCheckApi extends ApiClient {
  /**
   * Health check / ping
   */
  async ping(): Promise<ApiResponse<string>> {
    return this.get('/api/health-check/ping');
  }

  /**
   * Ping client to backend with device info
   */
  async pingClient(pingPayload: {
    is_gpu_alive: boolean;
    is_assistant_running: boolean;
  }): Promise<ApiResponse<string>> {
    return this.post('/api/health-check/ping-client', pingPayload);
  }

  /**
   * Ping GPU server
   */
  async pingGpuServer(): Promise<ApiResponse<string>> {
    return this.get('/api/health-check/ping-gpu-server');
  }

  /**
   * Wake up GPU server
   */
  async wakeupGpuServer(): Promise<ApiResponse<void>> {
    return this.post('/api/health-check/wakeup-gpu-server', {});
  }
}
