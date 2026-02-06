import { create } from 'zustand';

import { type VideoPanelHandle } from '@/components/custom/video-panel';
import { getElectron } from '@/lib/utils';
import { RunningState } from '@/types/app-state';

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

      // Clear previous history
      await electron.transcription.clear();
      await electron.replySuggestion.clear();
      await electron.codeSuggestion.clear();

      const config = useConfigStore.getState().config;
      const { videoPanelRef } = get();

      // Start WebRTC if face swap is enabled
      if (config?.faceSwap && videoPanelRef?.current) {
        await videoPanelRef.current.startWebRTC();
      }

      // Start WebRTC agents for media streaming
      await electron.webRtc.startAgents();

      // Start transcription services
      await electron.transcription.start();

      set({ runningState: RunningState.RUNNING });
      electron.appState.update({ runningState: RunningState.RUNNING });
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
      if (config?.faceSwap && videoPanelRef?.current) {
        videoPanelRef.current.stopWebRTC();
      }

      // Stop assistant services
      await electron.transcription.stop();
      await electron.replySuggestion.stop();
      await electron.codeSuggestion.stop();

      // Stop WebRTC agents for media streaming
      await electron.webRtc.stopAgents();

      set({ runningState: RunningState.IDLE });
      electron.appState.update({ runningState: RunningState.IDLE });
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
