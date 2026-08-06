import { useCallback, useEffect, useState } from 'react';

import { getElectron } from '@/lib/utils';

/**
 * Always-on-top state, owned by the main process.
 *
 * The value can change without the renderer asking - the hotkey toggles it in main - so the
 * seed comes from the config and every later change arrives over `onAlwaysOnTopChanged`.
 */
export default function useAlwaysOnTop(): { alwaysOnTop: boolean; toggle: () => void } {
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);

  useEffect(() => {
    const electron = getElectron();
    if (!electron) return;

    electron.config
      ?.get()
      .then((config) => setAlwaysOnTop(config.alwaysOnTop))
      .catch(() => {});

    return electron.onAlwaysOnTopChanged?.(setAlwaysOnTop);
  }, []);

  const toggle = useCallback(() => {
    getElectron()?.toggleAlwaysOnTop?.();
  }, []);

  return { alwaysOnTop, toggle };
}
