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

  updateAppState: (partial) => {
    const current = get().appState;
    if (current) {
      set({ appState: { ...current, ...partial } });
    }
  },

  addTranscript: (transcript) => {
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
  },
}));
