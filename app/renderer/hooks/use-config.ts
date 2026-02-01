import { type Config } from '@/types/config';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Helper to get Electron API
const getElectron = () => {
  return typeof window !== 'undefined' ? window.electronAPI : undefined;
};

export const useConfigQuery = () =>
  useQuery<Config, Error>({
    queryKey: ['config'],
    queryFn: async () => {
      const electron = getElectron();
      if (!electron?.config) {
        throw new Error('Electron API not available');
      }
      return electron.config.get();
    },
  });

export const useUpdateConfig = () => {
  const qc = useQueryClient();

  return useMutation<Config, Error, Partial<Config>>({
    mutationFn: async (payload) => {
      const electron = getElectron();
      if (!electron?.config) {
        throw new Error('Electron API not available');
      }
      return electron.config.update(payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['config'] }),
  });
};
