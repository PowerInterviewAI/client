import axiosClient from '@/lib/axiosClient';
import { type PyAudioDevice } from '@/types/audioDevice';
import { type APIError } from '@/types/error';
import { useQuery } from '@tanstack/react-query';

export const useAudioInputDevices = (refetchInterval?: number) =>
  useQuery<PyAudioDevice[], APIError>({
    queryKey: ['audioInputDevices'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/app/audio-input-devices');
      return data;
    },
    refetchInterval: refetchInterval,
  });

export const useAudioOutputDevices = (refetchInterval?: number) =>
  useQuery<PyAudioDevice[], APIError>({
    queryKey: ['audioOutputDevices'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/app/audio-output-devices');
      return data;
    },
    refetchInterval: refetchInterval,
  });
