/**
 * App State API
 * Get/update application state
 */

import { ApiClient, ApiResponse } from './client.js';
import { AppState } from '../types/app-state.js';

export class AppApi {
  constructor(private client: ApiClient) {}

  /**
   * Get current app state
   */
  async getState(): Promise<ApiResponse<AppState>> {
    return this.client.get<AppState>('/app/state');
  }

  /**
   * Update app state
   */
  async updateState(updates: Partial<AppState>): Promise<ApiResponse<AppState>> {
    return this.client.post<AppState>('/app/state', updates);
  }

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
