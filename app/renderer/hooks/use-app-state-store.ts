import { create } from 'zustand';
import { type AppState } from '@/types/app-state';
import { type Transcript, Speaker } from '@/types/transcript';

interface AppStateStore {
  appState: AppState | null;

  // Actions
  setAppState: (appState: AppState | null) => void;
  updateAppState: (partial: Partial<AppState>) => void;
  addTranscript: (transcript: {
    text: string;
    isFinal: boolean;
    speaker: 'user' | 'interviewer';
    timestamp: Date;
  }) => void;
}

export const useAppStateStore = create<AppStateStore>((set, get) => ({
  appState: null,

  setAppState: (appState) => set({ appState }),

  updateAppState: async (partial) => {
    const current = get().appState;
    if (current) {
      // Update local state immediately for responsiveness
      set({ appState: { ...current, ...partial } });
      
      // Sync to Electron in background
      if (window.electronAPI?.appState) {
        try {
          const updatedState = await window.electronAPI.appState.update(partial);
          // Update with server response to ensure consistency
          set({ appState: updatedState });
        } catch (error) {
          console.error('[AppStateStore] Error syncing to Electron:', error);
        }
      }
    }
  },

  addTranscript: async (transcript) => {
    // Sync to Electron first (it will handle the logic)
    if (window.electronAPI?.appState) {
      try {
        const updatedState = await window.electronAPI.appState.addTranscript(transcript);
        set({ appState: updatedState });
      } catch (error) {
        console.error('[AppStateStore] Error adding transcript to Electron:', error);
      }
    } else {
      // Fallback to local-only update if Electron API not available
      const current = get().appState;
      if (!current) return;

      const newTranscript: Transcript = {
        text: transcript.text,
        speaker: transcript.speaker === 'user' ? Speaker.SELF : Speaker.OTHER,
        timestamp: transcript.timestamp.getTime(),
      };

      // Only add if it's a final transcript (not partial)
      if (transcript.isFinal) {
        set({
          appState: {
            ...current,
            transcripts: [...current.transcripts, newTranscript],
          },
        });
      }
    }
  },
}));
