import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { liveTranscriptionService } from '@/services/live-transcription.service';
import { getLanguageOption, type Language } from '@/types/language';

import { useConfigStore } from './use-config-store';

/**
 * The interview language, plus a setter that persists it and applies it to a running session.
 *
 * Resolved through `getLanguageOption` rather than read raw: the stored value is whatever some
 * build wrote to disk, and a code this build does not know would otherwise render as a blank
 * trigger on the control bar.
 *
 * The two halves of the setting move at different speeds, and the setter is where that is
 * reconciled. Suggestions need nothing: each request reads the config store as it is built, so
 * the next one already follows the new language. The ASR sockets carry theirs as a connection
 * parameter, so they have to be torn down and re-opened - which takes a second or two and is why
 * `switching` exists rather than the change simply appearing to be instant.
 */
export function useInterviewLanguage() {
  const { config } = useConfigStore();
  const [switching, setSwitching] = useState(false);
  const option = getLanguageOption(config?.language);

  const setLanguage = useCallback(async (language: Language) => {
    const { config: current, updateConfig } = useConfigStore.getState();
    if (current?.language === language) return;

    try {
      await updateConfig({ language });
    } catch (e) {
      console.error('Failed to save interview language', e);
      toast.error('Failed to save interview language');
      return;
    }

    // Persisted first, reconnected second. If the reconnect fails the setting still stands and
    // the channel keeps retrying on it; rolling the setting back would leave the user with no
    // way to reach the language they picked.
    setSwitching(true);
    try {
      await liveTranscriptionService.setLanguage(language);
    } catch (e) {
      console.error('Failed to switch transcription language', e);
      toast.warning('Suggestions switched language; transcription is still reconnecting', {
        description: 'It keeps retrying. Stop and start the assistant if it does not come back.',
      });
    } finally {
      setSwitching(false);
    }
  }, []);

  return { language: option.code, option, switching, setLanguage };
}
