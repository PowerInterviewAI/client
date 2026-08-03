/**
 * Health Check API
 */

import { appStateService } from '../services/app-state.service.js';
import { RunningState } from '../types/app-state.js';
import { ClientPingRequest, ClientPingResponse } from '../types/health-check.js';
import { ApiClient, ApiResponse } from './client.js';

// Shorter than the 5s success interval, so a stalled socket cannot outlive a tick. The initial
// pingClient() is awaited before the liveness and 401 loops start, and HealthCheckService.start()
// is itself awaited during app startup, so without this a single stall holds both back.
const PING_TIMEOUT_MS = 4_000;

export class HealthCheckApi extends ApiClient {
  /**
   * Health check / ping
   */
  async ping(): Promise<ApiResponse<string>> {
    return this.get('/api/health-check/ping', undefined, PING_TIMEOUT_MS);
  }

  /**
   * Ping client to backend with device info
   */
  async pingClient(): Promise<ApiResponse<ClientPingResponse>> {
    const appState = appStateService.getState();
    return this.post<ClientPingResponse>(
      '/api/health-check/ping-client',
      {
        is_assistant_running: appState.runningState === RunningState.Running,
      } as ClientPingRequest,
      PING_TIMEOUT_MS
    );
  }
}
