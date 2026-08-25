import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { liveTranscriptionService } from '@/services/live-transcription.service';

import { useConfigStore } from './use-config-store';

/**
 * The selected microphone, plus a setter that persists it and applies it to a running session.
 *
 * Shaped like `useInterviewLanguage`, and different from it in the one way that matters: the
 * input device is not a connection parameter, so nothing reconnects. The socket, the provider
 * session and any utterance in flight all survive a swap, which is why this control can stay
 * live during a call without warning the user that the transcript is about to gap.
 *
 * Persisted first, applied second, and never rolled back on failure. A failed swap leaves the
 * session on the microphone it already had - the audio does not stop - so reverting the setting
 * would only leave the user with no route to the device they picked, while leaving it set means
 * stopping and starting the assistant reaches it.
 */
export function useAudioInputDevice() {
  const { config } = useConfigStore();
  const [switching, setSwitching] = useState(false);
  const deviceName = config?.audioInputDeviceName ?? '';

  const setDevice = useCallback(async (name: string) => {
    const { config: current, updateConfig } = useConfigStore.getState();
    if (current?.audioInputDeviceName === name) return;

    try {
      await updateConfig({ audioInputDeviceName: name });
    } catch (e) {
      console.error('Failed to save the selected microphone', e);
      toast.error('Failed to save the selected microphone');
      return;
    }

    setSwitching(true);
    try {
      await liveTranscriptionService.setAudioInputDevice(name);
    } catch (e) {
      // Unplugged, held by another app, or refused by permissions. The session is still running
      // on the previous device, so this is a warning rather than an error, and it says which
      // state the user is actually in - the setting took, the audio did not move.
      console.error('Failed to switch microphone', e);
      toast.warning('Saved, but the interview is still using the previous microphone', {
        description: 'Check the device is connected, then stop and start the assistant.',
      });
    } finally {
      setSwitching(false);
    }
  }, []);

  return { deviceName, switching, setDevice };
}
