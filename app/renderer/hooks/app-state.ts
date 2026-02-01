import axiosClient from '@/lib/axiosClient';
import { type AppState } from '@/types/appState';
import { type APIError } from '@/types/error';
import { useQuery } from '@tanstack/react-query';

export const useAppState = (refetchInterval?: number) =>
  useQuery<AppState, APIError>({
    queryKey: ['appState'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/app/get-state');
      return data;
    },
    refetchInterval: refetchInterval,
  });
