import { useEffect, useRef } from 'react';
import { useAppStateStore } from './use-app-state-store';

const POLL_INTERVAL = 1000; // 1 second

/**
 * Health check hook - polls app state from Electron main process
 * 
 * The actual health check logic (backend ping, GPU server checks, etc.)
 * runs in the Electron main process. This hook simply polls the state
 * and updates the React store.
 * 
 * Also initializes the React store with persisted state from Electron on mount.
 */
export function useHealthCheck() {
  const setAppState = useAppStateStore((state) => state.setAppState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const pollAppState = async () => {
      try {
        if (!window.electronAPI?.appState) {
          console.warn('[HealthCheck] Electron API not available');
          return;
        }

        const electronAppState = await window.electronAPI.appState.get();
        
        // Map Electron AppState (mixed case) to renderer AppState (snake_case)
        setAppState({
          is_logged_in: electronAppState.is_logged_in,
          assistant_state: electronAppState.assistant_state,
          transcripts: electronAppState.transcripts,
          suggestions: electronAppState.suggestions,
          code_suggestions: electronAppState.code_suggestions,
          is_backend_live: electronAppState.is_backend_live,
          is_gpu_server_live: electronAppState.is_gpu_server_live,
        });
      } catch (error) {
        console.error('[HealthCheck] Error polling app state:', error);
      }
    };

    // Initialize state immediately from Electron on mount
    pollAppState();

    // Set up interval to keep polling
    intervalRef.current = setInterval(pollAppState, POLL_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setAppState]); // Only depend on setAppState to avoid infinite loops
}
