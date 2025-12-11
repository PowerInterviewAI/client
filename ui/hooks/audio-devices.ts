import axiosClient from '@/lib/axiosClient';
import { PyAudioDevice } from '@/types/audioDevice';
import { APIError } from '@/types/error';
import { useQuery } from '@tanstack/react-query';

export const useAudioInputDevices = () =>
  useQuery<PyAudioDevice[], APIError>({
    queryKey: ['audioInputDevices'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/app/audio-input-devices');
      return data;
    },
    refetchInterval: 1000,
  });

export const useAudioOutputDevices = () =>
  useQuery<PyAudioDevice[], APIError>({
    queryKey: ['audioOutputDevices'],
    queryFn: async () => {
      const { data } = await axiosClient.get('/app/audio-output-devices');
      return data;
    },
    refetchInterval: 1000,
  });
