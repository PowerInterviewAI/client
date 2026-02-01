import { useEffect, useRef } from 'react';
import { useAppStateStore } from './use-app-state-store';

const SUCCESS_INTERVAL = 60 * 1000; // 1 minute
const FAILURE_INTERVAL = 1000; // 1 second

/**
 * Health check hook - monitors backend and GPU server availability
 * 
 * Performs periodic checks:
 * - Backend /ping endpoint
 * - Client to backend /ping-client with device info
 * - GPU server /ping-gpu-server
 * - GPU wakeup /wakeup-gpu-server if needed
 * 
 * Updates app state with is_backend_live and is_gpu_server_live.
 * Uses 1 minute interval on success, 1 second on failure.
 */
export function useHealthCheck() {
  const updateAppState = useAppStateStore((state) => state.updateAppState);
  const appState = useAppStateStore((state) => state.appState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    const performHealthChecks = async () => {
      // Prevent overlapping checks
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      let backendLive = false;
      let gpuServerLive = false;

      try {
        if (!window.electronAPI?.app) {
          console.warn('[HealthCheck] Electron API not available');
          isCheckingRef.current = false;
          return;
        }

        // 1. Check backend /ping
        const pingResult = await window.electronAPI.app.ping();
        backendLive = pingResult.success;

        if (backendLive) {
          // 2. Ping client to backend with device info
          const deviceInfo = {
            device_id: appState?.is_logged_in ? 'user-device' : 'anonymous',
            is_gpu_alive: appState?.is_gpu_server_live ?? false,
            is_assistant_running: appState?.assistant_state === 'running',
          };

          await window.electronAPI.app.pingClient(deviceInfo);

          // 3. Check GPU server
          const gpuPingResult = await window.electronAPI.app.pingGpuServer();
          gpuServerLive = gpuPingResult.success;

          // 4. Wake up GPU if not alive
          if (!gpuServerLive) {
            await window.electronAPI.app.wakeupGpuServer();
          }
        }
      } catch (error) {
        console.error('[HealthCheck] Error performing health checks:', error);
      }

      // Update app state with results
      updateAppState({
        is_backend_live: backendLive,
        is_gpu_server_live: gpuServerLive,
      });

      isCheckingRef.current = false;

      // Schedule next check based on results
      const nextInterval = backendLive ? SUCCESS_INTERVAL : FAILURE_INTERVAL;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(performHealthChecks, nextInterval);
    };

    // Start health checks immediately
    performHealthChecks();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Run once on mount

  return null;
}
