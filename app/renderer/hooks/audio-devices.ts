import { useQuery } from '@tanstack/react-query';
import { type AudioDevice } from '@/types/audio-device';

const getAudioDevices = async (kind: 'audioinput' | 'audiooutput'): Promise<AudioDevice[]> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === kind)
      .filter((device) => {
        const label = device.label.toLowerCase();
        return !label.includes('default') && !label.includes('communications');
      })
      .map((device, index) => ({
        name: device.label || `${kind === 'audioinput' ? 'Input' : 'Output'} Device ${index + 1}`,
        index,
      }));
  } catch (error) {
    console.error('Error enumerating devices:', error);
    return [];
  }
};

export const useAudioInputDevices = (refetchInterval?: number) =>
  useQuery<AudioDevice[], Error>({
    queryKey: ['audioInputDevices'],
    queryFn: () => getAudioDevices('audioinput'),
    refetchInterval: refetchInterval,
  });

export const useAudioOutputDevices = (refetchInterval?: number) =>
  useQuery<AudioDevice[], Error>({
    queryKey: ['audioOutputDevices'],
    queryFn: () => getAudioDevices('audiooutput'),
    refetchInterval: refetchInterval,
  });
