import axiosClient from '@/lib/axiosClient';
import { AppState } from '@/types/appState';
import { APIError } from '@/types/error';
import { useQuery } from '@tanstack/react-query';

export const useAppState = () =>
  useQuery<AppState, APIError>({
    queryKey: ['appState'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/app/get-state');
      return data;
    },
    refetchInterval: 50,
  });
