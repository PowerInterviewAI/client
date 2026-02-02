/**
 * Health Check Service
 * Monitors backend and GPU server availability and updates app state
 */

import { ApiClient } from '../api/client.js';
import { HealthCheckApi } from '../api/health-check.js';
import { configManager } from '../config/app.js';
import {
  AppState,
  Transcript,
  ReplySuggestion,
  CodeSuggestion,
  Speaker,
} from '../types/app-state.js';

const SUCCESS_INTERVAL = 60 * 1000; // 1 minute
const FAILURE_INTERVAL = 1000; // 1 second

export class HealthCheckService {
  private intervalHandle: NodeJS.Timeout | null = null;
  private isChecking: boolean = false;
  private appState: AppState;

  constructor() {
    // Initialize app state with defaults
    this.appState = {
      isRunning: false,
      isStealth: false,
      isRecording: false,
      devices: [],
      isBackendLive: false,
      isGpuServerLive: false,
      isLoggedIn: false,
      assistantState: 'idle',
      transcripts: [],
      replySuggestions: [],
      codeSuggestions: [],
    };
  }

  /**
   * Start health check monitoring
   */
  start(): void {
    console.log('[HealthCheckService] Starting health check service');
    this.performHealthChecks();
  }

  /**
   * Stop health check monitoring
   */
  stop(): void {
    console.log('[HealthCheckService] Stopping health check service');
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Get current app state
   */
  getAppState(): AppState {
    return { ...this.appState };
  }

  /**
   * Update app state (for external updates from main process)
   */
  updateAppState(updates: Partial<AppState>): void {
    this.appState = { ...this.appState, ...updates };
  }

  /**
   * Add a transcript to the app state
   */
  addTranscript(transcript: {
    text: string;
    isFinal: boolean;
    speaker: 'user' | 'interviewer';
    timestamp: Date;
  }): void {
    // Only add if it's a final transcript (not partial)
    if (!transcript.isFinal) return;

    const newTranscript: Transcript = {
      text: transcript.text,
      speaker: transcript.speaker === 'user' ? Speaker.SELF : Speaker.OTHER,
      timestamp: transcript.timestamp.getTime(),
    };

    this.appState = {
      ...this.appState,
      transcripts: [...this.appState.transcripts, newTranscript],
    };
  }

  /**
   * Add a reply suggestion to the app state
   */
  addReplySuggestion(suggestion: ReplySuggestion): void {
    this.appState = {
      ...this.appState,
      replySuggestions: [...this.appState.replySuggestions, suggestion],
    };
  }

  /**
   * Add a code suggestion to the app state
   */
  addCodeSuggestion(suggestion: CodeSuggestion): void {
    this.appState = {
      ...this.appState,
      codeSuggestions: [...this.appState.codeSuggestions, suggestion],
    };
  }

  /**
   * Clear all transcripts
   */
  clearTranscripts(): void {
    this.appState = {
      ...this.appState,
      transcripts: [],
    };
  }

  /**
   * Clear all suggestions
   */
  clearSuggestions(): void {
    this.appState = {
      ...this.appState,
      replySuggestions: [],
      codeSuggestions: [],
    };
  }

  /**
   * Perform health checks and update app state
   */
  private async performHealthChecks(): Promise<void> {
    // Prevent overlapping checks
    if (this.isChecking) return;
    this.isChecking = true;

    let backendLive = false;
    let gpuServerLive = false;

    try {
      const serverUrl = configManager.get('serverUrl');

      const healthCheckApi = new HealthCheckApi(new ApiClient(serverUrl + '/health-check'));

      // 1. Check backend /ping
      const pingResult = await healthCheckApi.ping();
      backendLive = !pingResult.error && pingResult.data != null;
      console.log('[HealthCheckService] Backend ping result:', {
        backendLive,
        error: pingResult.error,
      });

      if (backendLive) {
        // 2. Ping client to backend with device info
        const deviceInfo = {
          device_id: this.appState.isLoggedIn ? 'user-device' : 'anonymous',
          is_gpu_alive: this.appState.isGpuServerLive,
          is_assistant_running: this.appState.assistantState === 'running',
        };

        await healthCheckApi.pingClient(deviceInfo);

        // 3. Check GPU server
        const gpuPingResult = await healthCheckApi.pingGpuServer();
        gpuServerLive = !gpuPingResult.error && gpuPingResult.data != null;

        // 4. Wake up GPU if not alive
        if (!gpuServerLive) {
          console.log('[HealthCheckService] Waking up GPU server');
          await healthCheckApi.wakeupGpuServer();
        }
      }
    } catch (error) {
      console.error('[HealthCheckService] Error performing health checks:', error);
    }

    // Update app state with results
    this.appState = {
      ...this.appState,
      isBackendLive: backendLive,
      isGpuServerLive: gpuServerLive,
    };

    this.isChecking = false;

    // Schedule next check based on results
    const nextInterval = backendLive ? SUCCESS_INTERVAL : FAILURE_INTERVAL;

    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }

    this.intervalHandle = setInterval(() => this.performHealthChecks(), nextInterval);
  }
}

// Singleton instance
export const healthCheckService = new HealthCheckService();
