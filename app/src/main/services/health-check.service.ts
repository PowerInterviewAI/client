/**
 * Health Check Service
 * Monitors backend and GPU server availability and updates app state
 */

import { ApiClient } from '../api/client.js';
import { HealthCheckApi } from '../api/health-check.js';
import { configManager } from '../config/app.js';
import { appStateService } from './app-state.service.js';
import { safeSleep } from '../utils/sleep.js';

const SUCCESS_INTERVAL = 60 * 1000; // 1 minute
const FAILURE_INTERVAL = 1 * 1000; // 1 second

export class HealthCheckService {
  private running = false;

  /**
   * Start health check monitoring
   */
  start(): void {
    console.log('[HealthCheckService] Starting health check service');
    if (this.running) return;
    this.running = true;
    this.startBackendLoop();
    this.startClientLoop();
    this.startGpuLoop();
  }

  /**
   * Stop health check monitoring
   */
  stop(): void {
    console.log('[HealthCheckService] Stopping health check service');
    this.running = false;
  }

  /** Get HealthCheckApi instance */
  private getApi(): HealthCheckApi {
    return new HealthCheckApi();
  }
  // use safeSleep util for cancellable/abortable sleeps

  /** Backend ping loop */
  private startBackendLoop(): void {
    (async () => {
      while (this.running) {
        let backendLive = false;
        try {
          const healthCheckApi = this.getApi();
          const pingResult = await healthCheckApi.ping();

          backendLive = !pingResult.error && pingResult.data != null;
          console.log('[HealthCheckService] Backend ping result:', {
            backendLive,
            error: pingResult.error,
          });
        } catch (error) {
          console.error('[HealthCheckService] Backend ping error:', error);
        }

        appStateService.updateState({ isBackendLive: backendLive });

        const next = backendLive ? SUCCESS_INTERVAL : FAILURE_INTERVAL;
        await safeSleep(next);
      }
    })();
  }

  /** Client ping loop */
  private startClientLoop(): void {
    (async () => {
      while (this.running) {
        let nextInterval = SUCCESS_INTERVAL;

        try {
          const healthCheckApi = this.getApi();

          const currentState = appStateService.getState();
          const deviceInfo = {
            device_id: currentState.isLoggedIn ? 'user-device' : 'anonymous',
            is_gpu_alive: currentState.isGpuServerLive,
            is_assistant_running: currentState.assistantState === 'running',
          };

          await healthCheckApi.pingClient(deviceInfo);
        } catch (error) {
          console.error('[HealthCheckService] Client ping error:', error);
          nextInterval = FAILURE_INTERVAL;
        }

        await safeSleep(nextInterval);
      }
    })();
  }

  /** GPU ping loop, triggers wakeup if needed */
  private startGpuLoop(): void {
    (async () => {
      while (this.running) {
        let gpuServerLive = false;
        try {
          const healthCheckApi = this.getApi();

          const gpuPingResult = await healthCheckApi.pingGpuServer();
          gpuServerLive = !gpuPingResult.error && gpuPingResult.data != null;

          if (!gpuServerLive) {
            console.log('[HealthCheckService] GPU not live, attempting wakeup');
            await healthCheckApi.wakeupGpuServer();
          }
        } catch (error) {
          console.error('[HealthCheckService] GPU ping/wakeup error:', error);
        }

        appStateService.updateState({ isGpuServerLive: gpuServerLive });

        const next = gpuServerLive ? SUCCESS_INTERVAL : FAILURE_INTERVAL;
        await safeSleep(next);
      }
    })();
  }
}

// Singleton instance
export const healthCheckService = new HealthCheckService();
