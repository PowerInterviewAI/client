import { create } from 'zustand';
import { type Config } from '@/types/config';

// Helper to get Electron API
const getElectron = () => {
  return typeof window !== 'undefined' ? window.electronAPI : undefined;
};

interface ConfigStore {
  config: Config | undefined;
  isLoading: boolean;
  error: Error | null;
  
  // Actions
  loadConfig: () => Promise<void>;
  setConfig: (config: Config | undefined) => void;
  updateConfig: (partial: Partial<Config>) => Promise<void>;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: undefined,
  isLoading: false,
  error: null,

  loadConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const electron = getElectron();
      if (!electron?.config) {
        throw new Error('Electron API not available');
      }
      const config = await electron.config.get();
      set({ config, isLoading: false });
    } catch (error) {
      set({ error: error as Error, isLoading: false });
    }
  },

  setConfig: (config) => set({ config }),

  updateConfig: async (partial) => {
    const currentConfig = get().config;
    
    // Optimistic update
    const newConfig = currentConfig ? { ...currentConfig, ...partial } : undefined;
    set({ config: newConfig });

    try {
      const electron = getElectron();
      if (!electron?.config) {
        throw new Error('Electron API not available');
      }
      // Save to Electron
      const savedConfig = (await electron.config.update(partial)) as Config;
      set({ config: savedConfig });
    } catch (error) {
      // Rollback on error
      set({ config: currentConfig, error: error as Error });
      throw error;
    }
  },
}));
