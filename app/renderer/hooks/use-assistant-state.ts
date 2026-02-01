import { RunningState } from '@/types/app-state';
import { create } from 'zustand';
import { type VideoPanelHandle } from '@/components/video-panel';
import { useConfigStore } from './use-config-store';

interface AssistantState {
  runningState: RunningState;
  error: string | null;
  videoPanelRef: React.RefObject<VideoPanelHandle> | null;

  // Actions
  startAssistant: () => Promise<void>;
  stopAssistant: () => Promise<void>;
  setRunningState: (state: RunningState) => void;
  setError: (error: string | null) => void;
  setVideoPanelRef: (ref: React.RefObject<VideoPanelHandle> | null) => void;
}

// Helper to get Electron API
const getElectron = () => {
  return typeof window !== 'undefined' ? window.electronAPI : undefined;
};

export const useAssistantState = create<AssistantState>((set, get) => ({
  runningState: RunningState.IDLE,
  error: null,
  videoPanelRef: null,

  startAssistant: async () => {
    try {
      set({ runningState: RunningState.STARTING, error: null });

      const electron = getElectron();
      if (!electron) {
        throw new Error('Electron API not available');
      }

      const config = useConfigStore.getState().config;
      const { videoPanelRef } = get();

      // Start WebRTC if face swap is enabled
      if (config?.face_swap && videoPanelRef?.current) {
        await videoPanelRef.current.startWebRTC();
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

      const config = useConfigStore.getState().config;
      const { videoPanelRef } = get();

      // Stop WebRTC if face swap is enabled
      if (config?.face_swap && videoPanelRef?.current) {
        videoPanelRef.current.stopWebRTC();
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

  setVideoPanelRef: (ref: React.RefObject<VideoPanelHandle> | null) => {
    set({ videoPanelRef: ref });
  },
}));
