/**
 * App State Context
 * Lightweight state management using React Context
 * All state is stored in Electron and accessed via IPC
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { type AppState } from '@/types/app-state';

interface AppStateContextType {
  appState: AppState | null;
  refreshState: () => Promise<void>;
  addTranscript: (transcript: {
    text: string;
    isFinal: boolean;
    speaker: 'user' | 'interviewer';
    timestamp: Date;
  }) => Promise<void>;
  updateAppState: (updates: Partial<AppState>) => Promise<void>;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useState<AppState | null>(null);
  const isMounted = useRef(true);

  const refreshState = useCallback(async () => {
    try {
      if (!window.electronAPI?.appState) {
        console.warn('[AppState] Electron API not available');
        return;
      }

      const electronAppState = await window.electronAPI.appState.get();
      if (isMounted.current) {
        setAppState({
          is_logged_in: electronAppState.is_logged_in,
          assistant_state: electronAppState.assistant_state,
          transcripts: electronAppState.transcripts,
          suggestions: electronAppState.suggestions,
          code_suggestions: electronAppState.code_suggestions,
          is_backend_live: electronAppState.is_backend_live,
          is_gpu_server_live: electronAppState.is_gpu_server_live,
        });
      }
    } catch (error) {
      console.error('[AppState] Error fetching state:', error);
    }
  }, []);

  const addTranscript = useCallback(
    async (transcript: {
      text: string;
      isFinal: boolean;
      speaker: 'user' | 'interviewer';
      timestamp: Date;
    }) => {
      try {
        if (!window.electronAPI?.appState) return;

        const updatedState = await window.electronAPI.appState.addTranscript(transcript);
        if (isMounted.current) {
          setAppState({
            is_logged_in: updatedState.is_logged_in,
            assistant_state: updatedState.assistant_state,
            transcripts: updatedState.transcripts,
            suggestions: updatedState.suggestions,
            code_suggestions: updatedState.code_suggestions,
            is_backend_live: updatedState.is_backend_live,
            is_gpu_server_live: updatedState.is_gpu_server_live,
          });
        }
      } catch (error) {
        console.error('[AppState] Error adding transcript:', error);
      }
    },
    []
  );

  const updateAppState = useCallback(async (updates: Partial<AppState>) => {
    try {
      if (!window.electronAPI?.appState) return;

      const updatedState = await window.electronAPI.appState.update(updates);
      if (isMounted.current) {
        setAppState({
          is_logged_in: updatedState.is_logged_in,
          assistant_state: updatedState.assistant_state,
          transcripts: updatedState.transcripts,
          suggestions: updatedState.suggestions,
          code_suggestions: updatedState.code_suggestions,
          is_backend_live: updatedState.is_backend_live,
          is_gpu_server_live: updatedState.is_gpu_server_live,
        });
      }
    } catch (error) {
      console.error('[AppState] Error updating state:', error);
    }
  }, []);

  // Cleanup mounted flag
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Poll state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      void refreshState();
    }, 1000);

    return () => clearInterval(interval);
  }, [refreshState]);

  // Initial load on mount
  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const value = useMemo(
    () => ({
      appState,
      refreshState,
      addTranscript,
      updateAppState,
    }),
    [appState, refreshState, addTranscript, updateAppState]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

// Export hook for accessing app state
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
