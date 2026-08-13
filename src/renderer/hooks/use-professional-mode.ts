import { useCallback } from 'react';
import { toast } from 'sonner';

import { useConfigStore } from './use-config-store';

/**
 * Whether suggestions are generated as hints (headline + keyword bullets) instead of prose,
 * plus a toggle that persists the change.
 *
 * Shared by the control panel button and the global hotkey. The toggle reads the store
 * imperatively so it stays referentially stable, which lets the hotkey listener subscribe once
 * instead of resubscribing on every config change.
 *
 * Absent means off, unlike the transcript dock: prose is what every existing user already has.
 */
export function useProfessionalMode() {
  const { config } = useConfigStore();

  const toggle = useCallback(() => {
    const { config: current, updateConfig } = useConfigStore.getState();
    updateConfig({ professionalMode: current?.professionalMode !== true }).catch((e) => {
      console.error('Failed to save professional mode setting', e);
      toast.error('Failed to save professional mode setting');
    });
  }, []);

  return { enabled: config?.professionalMode === true, toggle };
}
