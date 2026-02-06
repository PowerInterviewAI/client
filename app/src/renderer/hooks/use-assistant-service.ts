import { create } from 'zustand';

import { type VideoPanelHandle } from '@/components/custom/video-panel';
import { getElectron } from '@/lib/utils';
import { RunningState } from '@/types/app-state';

import { useConfigStore } from './use-config-store';

interface AssistantService {
  error: string | null;
  videoPanelRef: React.RefObject<VideoPanelHandle> | null;

  // Actions
  startAssistant: () => Promise<void>;
  stopAssistant: () => Promise<void>;
  setError: (error: string | null) => void;
  setVideoPanelRef: (ref: React.RefObject<VideoPanelHandle> | null) => void;
}

export const useAssistantService = create<AssistantService>((set, get) => ({
  error: null,
  videoPanelRef: null,

  startAssistant: async () => {
    try {
      set({ error: null });

      const electron = getElectron();
      if (!electron) {
        throw new Error('Electron API not available');
      }

      // Clear previous history
      await electron.tools.clearAll();

      const config = useConfigStore.getState().config;
      const { videoPanelRef } = get();

      // Start WebRTC if face swap is enabled
      if (config?.faceSwap && videoPanelRef?.current) {
        Promise.all([videoPanelRef.current.startWebRTC(), electron.webRtc.startAgents()]);
      }

      // Start transcription services
      await electron.transcription.start();

      electron.appState.update({ runningState: RunningState.RUNNING });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start assistant';
      set({
        error: errorMessage,
      });
      console.error('Start assistant error:', error);
      throw error;
    }
  },

  stopAssistant: async () => {
    try {
      set({ error: null });

      const electron = getElectron();
      if (!electron) {
        throw new Error('Electron API not available');
      }

      const config = useConfigStore.getState().config;
      const { videoPanelRef } = get();

      // Stop WebRTC if face swap is enabled
      if (config?.faceSwap && videoPanelRef?.current) {
        videoPanelRef.current.stopWebRTC();
        await electron.webRtc.stopAgents();
      }

      // Stop assistant services
      Promise.all([
        electron.transcription.stop(),
        electron.replySuggestion.stop(),
        electron.codeSuggestion.stop(),
      ]);

      set({ error: null });
      electron.appState.update({ runningState: RunningState.IDLE });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop assistant';
      set({
        error: errorMessage,
      });
      console.error('Stop assistant error:', error);
      throw error;
    }
  },

  setError: (error: string | null) => {
    set({ error });
  },

  setVideoPanelRef: (ref: React.RefObject<VideoPanelHandle> | null) => {
    set({ videoPanelRef: ref });
  },
}));
