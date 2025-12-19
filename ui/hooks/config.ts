import axiosClient from '@/lib/axiosClient';
import { Config } from '@/types/config';
import { APIError } from '@/types/error';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const useConfigQuery = () =>
  useQuery<Config, APIError>({
    queryKey: ['config'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/app/get-config');
      return data;
    },
  });

export const useUpdateConfig = () => {
  const qc = useQueryClient();

  return useMutation<Config, APIError, Partial<Config>>({
    mutationFn: async (payload) => {
      const { data } = await axiosClient.put('/app/update-config', payload);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['config'] }),
  });
};
