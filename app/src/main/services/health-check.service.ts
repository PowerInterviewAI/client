/**
 * Health Check Service
 * Monitors backend and GPU server availability and updates app state
 */

import { ApiClient } from '../api/client.js';
import { HealthCheckApi } from '../api/health-check.js';
import { configManager } from '../config/app.js';
import { appStateService } from './app-state.service.js';

const SUCCESS_INTERVAL = 60 * 1000; // 1 minute
const CLIENT_INTERVAL = 60 * 1000; // client ping interval
const GPU_INTERVAL = 60 * 1000; // gpu ping interval
const FAILURE_INTERVAL = 1000; // 1 second

export class HealthCheckService {
  private backendInterval: NodeJS.Timeout | null = null;
  private clientInterval: NodeJS.Timeout | null = null;
  private gpuInterval: NodeJS.Timeout | null = null;
  private isCheckingBackend = false;
  private isCheckingClient = false;
  private isCheckingGpu = false;

  /**
   * Start health check monitoring
   */
  start(): void {
    console.log('[HealthCheckService] Starting health check service');
    this.startBackendLoop();
    this.startClientLoop();
    this.startGpuLoop();
  }

  /**
   * Stop health check monitoring
   */
  stop(): void {
    console.log('[HealthCheckService] Stopping health check service');
    if (this.backendInterval) {
      clearInterval(this.backendInterval);
      this.backendInterval = null;
    }
    if (this.clientInterval) {
      clearInterval(this.clientInterval);
      this.clientInterval = null;
    }
    if (this.gpuInterval) {
      clearInterval(this.gpuInterval);
      this.gpuInterval = null;
    }
  }

  private getApi(): HealthCheckApi {
    const serverUrl = configManager.get('serverUrl');
    return new HealthCheckApi(serverUrl);
  }

  /** Backend ping loop */
  private async startBackendLoop(): Promise<void> {
    const runCheck = async () => {
      if (this.isCheckingBackend) return;
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
    };

    // run immediately
    await runCheck();

    // schedule interval depending on backend state (first tick uses SUCCESS_INTERVAL/FAILURE_INTERVAL)
    this.backendInterval = setInterval(async () => {
      await runCheck();
    }, SUCCESS_INTERVAL);
  }

  /** Client ping loop */
  private async startClientLoop(): Promise<void> {
    const runCheck = async () => {
      if (this.isCheckingClient) return;
      this.isCheckingClient = true;

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
      }

      this.isCheckingClient = false;
    };

    // run immediately
    await runCheck();
    this.clientInterval = setInterval(() => runCheck(), CLIENT_INTERVAL);
  }

  /** GPU ping loop, triggers wakeup if needed */
  private async startGpuLoop(): Promise<void> {
    const runCheck = async () => {
      if (this.isCheckingGpu) return;
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
    };

    // run immediately
    await runCheck();
    this.gpuInterval = setInterval(() => runCheck(), GPU_INTERVAL);
  }
}

// Singleton instance
export const healthCheckService = new HealthCheckService();
