/**
 * Health Check Service
 * Monitors backend and GPU server availability and updates app state
 */

import { ApiClient } from '../api/client.js';
import { HealthCheckApi } from '../api/health-check.js';
import { configManager } from '../config/app.js';
import { appStateService } from './app-state.service.js';

const SUCCESS_INTERVAL = 60 * 1000; // 1 minute
const FAILURE_INTERVAL = 1 * 1000; // 1 second

export class HealthCheckService {
  private isCheckingBackend = false;
  private isCheckingClient = false;
  private isCheckingGpu = false;

  private running = false;
  private backendTimer: NodeJS.Timeout | null = null;
  private clientTimer: NodeJS.Timeout | null = null;
  private gpuTimer: NodeJS.Timeout | null = null;

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

    if (this.backendTimer) {
      clearTimeout(this.backendTimer);
      this.backendTimer = null;
    }
    if (this.clientTimer) {
      clearTimeout(this.clientTimer);
      this.clientTimer = null;
    }
    if (this.gpuTimer) {
      clearTimeout(this.gpuTimer);
      this.gpuTimer = null;
    }

    this.isCheckingBackend = false;
    this.isCheckingClient = false;
    this.isCheckingGpu = false;
  }

  /** Get HealthCheckApi instance */
  private getApi(): HealthCheckApi {
    const serverUrl = configManager.get('serverUrl');
    return new HealthCheckApi(serverUrl);
  }

  /** Backend ping loop */
  private async startBackendLoop(): Promise<void> {
    const runCheck = async () => {
      if (!this.running || this.isCheckingBackend) return;
      this.isCheckingBackend = true;

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

      // update state
      appStateService.updateState({ isBackendLive: backendLive });

      this.isCheckingBackend = false;

      if (!this.running) return;
      const next = backendLive ? SUCCESS_INTERVAL : FAILURE_INTERVAL;
      this.backendTimer = setTimeout(() => runCheck(), next);
    };

    // run immediately
    await runCheck();
  }

  /** Client ping loop */
  private async startClientLoop(): Promise<void> {
    const runCheck = async () => {
      if (!this.running || this.isCheckingClient) return;
      this.isCheckingClient = true;

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

      this.isCheckingClient = false;

      if (!this.running) return;
      this.clientTimer = setTimeout(() => runCheck(), nextInterval);
    };

    // run immediately
    await runCheck();
  }

  /** GPU ping loop, triggers wakeup if needed */
  private async startGpuLoop(): Promise<void> {
    const runCheck = async () => {
      if (!this.running || this.isCheckingGpu) return;
      this.isCheckingGpu = true;

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
      this.isCheckingGpu = false;

      if (!this.running) return;
      const next = gpuServerLive ? SUCCESS_INTERVAL : FAILURE_INTERVAL;
      this.gpuTimer = setTimeout(() => runCheck(), next);
    };

    // run immediately
    await runCheck();
  }
}

// Singleton instance
export const healthCheckService = new HealthCheckService();
