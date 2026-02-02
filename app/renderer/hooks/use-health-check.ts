import { useEffect, useRef } from 'react';
import { useAppStateStore } from './use-app-state-store';
import { RunningState } from '@/types/app-state';

const POLL_INTERVAL = 1000; // 1 second

/**
 * Health check hook - polls app state from Electron main process
 * 
 * The actual health check logic (backend ping, GPU server checks, etc.)
 * runs in the Electron main process. This hook simply polls the state
 * and updates the React store.
 */
export function useHealthCheck() {
  const setAppState = useAppStateStore((state) => state.setAppState);
  const appState = useAppStateStore((state) => state.appState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pollAppState = async () => {
      try {
        if (!window.electronAPI?.appState) {
          console.warn('[HealthCheck] Electron API not available');
          return;
        }

        const electronAppState = await window.electronAPI.appState.get();
        
        // Update the React store with health check results from Electron
        // Keep existing appState values for fields not managed by Electron
        setAppState({
          is_logged_in: appState?.is_logged_in ?? null,
          assistant_state: appState?.assistant_state ?? RunningState.IDLE,
          transcripts: appState?.transcripts ?? [],
          suggestions: appState?.suggestions ?? [],
          code_suggestions: appState?.code_suggestions ?? [],
          is_backend_live: electronAppState.is_backend_live,
          is_gpu_server_live: electronAppState.is_gpu_server_live,
        });
      } catch (error) {
        console.error('[HealthCheck] Error polling app state:', error);
      }
    };

    // Start polling immediately
    pollAppState();

    // Set up interval
    intervalRef.current = setInterval(pollAppState, POLL_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setAppState, appState]); // Include dependencies
}
