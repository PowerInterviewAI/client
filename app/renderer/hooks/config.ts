import axiosClient from '@/lib/axiosClient';
import { type Config } from '@/types/config';
import { type APIError } from '@/types/error';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Check if running in Electron environment
const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI?.config;
};

export const useConfigQuery = () =>
  useQuery<Config, APIError>({
    queryKey: ['config'],
    queryFn: async () => {
      // Use Electron IPC if available
      if (isElectron()) {
        return window.electronAPI!.config.get();
      }
      
      // Fallback to HTTP API
      const { data } = await axiosClient.get('/app/get-config');
      return data;
    },
  });

export const useUpdateConfig = () => {
  const qc = useQueryClient();

  return useMutation<Config, APIError, Partial<Config>>({
    mutationFn: async (payload) => {
      // Use Electron IPC if available
      if (isElectron()) {
        return window.electronAPI!.config.update(payload);
      }
      
      // Fallback to HTTP API
      const { data } = await axiosClient.put('/app/update-config', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['config'] }),
  });
};
