'use client';

import { useEffect, useState } from 'react';

export default function useIsStealthMode(): boolean {
  const [isStealth, setIsStealth] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const update = () => setIsStealth(document.body.classList.contains('stealth'));
    update();

    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') {
          update();
          break;
        }
      }
    });

    try {
      obs.observe(document.body, { attributes: true });
    } catch (e) {
      // ignore environments where observing isn't permitted
    }

    return () => {
      try {
        obs.disconnect();
      } catch (e) {
        /* ignore */
      }
    };
  }, []);

  return isStealth;
}
