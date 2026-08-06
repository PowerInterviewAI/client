import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import useIsStealthMode from './use-is-stealth-mode';

// Radix sets `document.body { pointer-events: none }` while a modal layer is open and restores it
// from that layer's effect cleanup. Closing a layer runs the cleanup; *unmounting the tree around
// an open one* is not guaranteed to, and this app does that in several ways - a menu item that
// changes route, stealth mode dropping the titlebar and control panel outright, a page swapping
// itself for the loading screen when a session ends. A stranded lock leaves the whole window
// unclickable, which reads as "nothing works" rather than as a bug in whatever opened the layer.
const OPEN_LAYER_SELECTOR = [
  '[data-state="open"][role="menu"]',
  '[data-state="open"][role="dialog"]',
  '[data-state="open"][role="listbox"]',
].join(',');

function releaseOrphanedLock() {
  if (document.body.style.pointerEvents !== 'none') return;
  // A layer that is still open owns the lock legitimately - only reclaim an orphaned one.
  if (document.querySelector(OPEN_LAYER_SELECTOR)) return;
  document.body.style.removeProperty('pointer-events');
}

export default function usePointerLockGuard(): void {
  const { pathname } = useLocation();
  const isStealth = useIsStealthMode();

  useEffect(releaseOrphanedLock, [pathname, isStealth]);

  useEffect(() => {
    // Backstop for whatever the two triggers above miss. A locked body stops hit-testing, so the
    // click the user makes when nothing responds lands on <html> - which is the signal to recover.
    const onPointerDown = (event: PointerEvent) => {
      if (event.target === document.documentElement) releaseOrphanedLock();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);
}
