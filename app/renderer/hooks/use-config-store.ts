import { create } from 'zustand';
import { type Config } from '@/types/config';

interface ConfigStore {
  config: Config | undefined;
  setConfig: (config: Config | undefined) => void;
  updatePartialConfig: (partial: Partial<Config>) => void;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: undefined,
  setConfig: (config) => set({ config }),
  updatePartialConfig: (partial) =>
    set((state) => ({
      config: state.config ? { ...state.config, ...partial } : undefined,
    })),
}));
