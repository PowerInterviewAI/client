/**
 * Health Check API
 */

import { appStateService } from '../services/app-state.service.js';
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
  async pingClient(): Promise<ApiResponse<string>> {
    const payload = {
      is_gpu_alive: false,
      is_assistant_running: false,
    };
    return this.post('/api/health-check/ping-client', payload);
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
