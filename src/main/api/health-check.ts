/**
 * Health Check API
 */

import { appStateService } from '../services/app-state.service.js';
import { RunningState } from '../types/app-state.js';
import { ClientPingRequest, ClientPingResponse } from '../types/health-check.js';
import { ApiClient, ApiResponse } from './client.js';

// The initial pingClient() is awaited before the liveness and 401 loops start, and
// HealthCheckService.start() is itself awaited during app startup, so without a bound here a
// single stalled socket holds both back for as long as the runtime's default allows.
//
// Generous rather than tight: the loops await each ping and only then sleep, so this never
// overlaps a tick, and ping-client authenticates against the database. Cutting it close to the
// 5s interval would report a slow-but-alive backend as down on a high-latency connection.
const PING_TIMEOUT_MS = 10_000;

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
