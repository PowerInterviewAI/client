import { type AudioDevice } from '@/types/audio-device';

import { type MediaDevicesResult, useMediaDevices } from './use-media-devices';

function filterAudioDevices(devices: MediaDeviceInfo[], deviceType: string): AudioDevice[] {
  return devices
    .filter((d) => {
      const label = d.label.toLowerCase();
      return !label.includes('default') && !label.includes('communications');
    })
    .map((d, index) => ({
      name: d.label || `${deviceType} Device ${index + 1}`,
      index,
    }));
}

export function useAudioInputDevices(): MediaDevicesResult<AudioDevice> {
  return useMediaDevices('audioinput', (devices) => filterAudioDevices(devices, 'Input'));
}
