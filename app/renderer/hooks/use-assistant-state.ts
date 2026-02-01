import { RunningState } from '@/types/app-state';
import { create } from 'zustand';

interface AssistantState {
  runningState: RunningState;
  error: string | null;

  // Actions
  startAssistant: () => Promise<void>;
  stopAssistant: () => Promise<void>;
  setRunningState: (state: RunningState) => void;
  setError: (error: string | null) => void;
}

// Helper to get Electron API
const getElectron = () => {
  return typeof window !== 'undefined' ? window.electronAPI : undefined;
};

export const useAssistantState = create<AssistantState>((set) => ({
  runningState: RunningState.IDLE,
  error: null,

  startAssistant: async () => {
    try {
      set({ runningState: RunningState.STARTING, error: null });

      const electron = getElectron();
      if (!electron) {
        throw new Error('Electron API not available');
      }

      // TODO: Call electron method to start assistant
      // await electron.assistant.start();

      // Simulate async operation for now
      await new Promise((resolve) => setTimeout(resolve, 500));

      set({ runningState: RunningState.RUNNING });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start assistant';
      set({
        runningState: RunningState.IDLE,
        error: errorMessage,
      });
      console.error('Start assistant error:', error);
      throw error;
    }
  },

  stopAssistant: async () => {
    try {
      set({ runningState: RunningState.STOPPING, error: null });

      const electron = getElectron();
      if (!electron) {
        throw new Error('Electron API not available');
      }

      // TODO: Call electron method to stop assistant
      // await electron.assistant.stop();

      // Simulate async operation for now
      await new Promise((resolve) => setTimeout(resolve, 500));

      set({ runningState: RunningState.STOPPED });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop assistant';
      set({
        runningState: RunningState.RUNNING,
        error: errorMessage,
      });
      console.error('Stop assistant error:', error);
      throw error;
    }
  },

  setRunningState: (state: RunningState) => {
    set({ runningState: state });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
