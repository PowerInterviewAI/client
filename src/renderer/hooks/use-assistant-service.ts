import { create } from 'zustand';

import { getElectron } from '@/lib/utils';
import { liveTranscriptionService } from '@/services/live-transcription.service';
import { RunningState } from '@/types/app-state';
import { DEFAULT_LANGUAGE } from '@/types/language';

import { useConfigStore } from './use-config-store';

interface AssistantService {
  error: string | null;

  // Actions
  startAssistant: () => Promise<void>;
  stopAssistant: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAssistantService = create<AssistantService>((set) => ({
  error: null,

  startAssistant: async () => {
    const electron = getElectron();
    if (!electron) {
      throw new Error('Electron API not available');
    }

    try {
      set({ error: null });

      electron.appState.update({ runningState: RunningState.Starting });

      // Clear previous history
      await electron.tools.clearAll();

      const config = useConfigStore.getState().config;

      // Start transcription services
      await electron.transcription.start();
      // The language the sockets open on. It can change mid-session after this, but only
      // through useInterviewLanguage, which reconnects them - nothing else reads it again.
      await liveTranscriptionService.start(
        config?.audioInputDeviceName ?? '',
        config?.sessionToken ?? '',
        config?.language ?? DEFAULT_LANGUAGE
      );

      // Sleep 3 seconds to ensure the assistant has fully started before allowing stop actions
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Update running state to Running after successful start
      electron.appState.update({ runningState: RunningState.Running });
    } catch (error) {
      // Tear down before resetting state. `electron.transcription.start()` may already have
      // succeeded, and leaving it active while runningState goes back to Idle strands the app
      // in a state where transcripts keep flowing (so live suggestions still fire) but every
      // action-suggestion hotkey refuses forever, because those gate on runningState.
      await Promise.allSettled([
        liveTranscriptionService.stop(),
        electron.transcription.stop(),
      ]);

      // Reset state to Idle so the button doesn't stay stuck on "Starting..."
      electron.appState.update({ runningState: RunningState.Idle });
      const errorMessage = error instanceof Error ? error.message : 'Failed to start assistant';
      set({ error: errorMessage });
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
      electron.appState.update({ runningState: RunningState.Stopping });

      // Stop assistant services
      await Promise.all([
        liveTranscriptionService.stop(),
        electron.transcription.stop(),
        electron.liveSuggestion.stop(),
        electron.actionSuggestion.stop(),
      ]);

      electron.setStealth(false); // Ensure stealth mode is turned off when stopping assistant

      // Sleep 3 seconds to ensure the assistant has fully stopped before allowing start actions
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Update running state to Idle after successful stop
      electron.appState.update({ runningState: RunningState.Idle });
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
}));
