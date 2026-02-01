import { create } from 'zustand';
import { type AppState } from '@/types/app-state';

interface AppStateStore {
  appState: AppState | null;
  
  // Actions
  setAppState: (appState: AppState | null) => void;
  updateAppState: (partial: Partial<AppState>) => void;
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
}));
