/**
 * Always-on-top is a persisted user preference, but stealth mode also drives the same window
 * property at a higher z-order level. The failure mode that matters is stealth mode resetting the
 * preference on its way out: the user turns stealth on and off once, and their window silently
 * stops floating with nothing to explain why.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('always-on-top');

  const { configStore } = await loadMain('store/config.store.js');
  const windowControl = await loadMain('services/window-control.service.js');

  const calls = [];
  windowControl.setWindowReference({
    isDestroyed: () => false,
    setAlwaysOnTop: (enabled, level) => calls.push({ enabled, level }),
    setVisibleOnAllWorkspaces: () => {},
    setIgnoreMouseEvents: () => {},
    setFocusable: () => {},
    setOpacity: () => {},
    webContents: { send: () => {} },
  });

  check('defaults to on', configStore.getConfig().alwaysOnTop === true);

  windowControl.applyAlwaysOnTop();
  check(
    'applies at the floating level, not the stealth level',
    calls.at(-1)?.enabled === true && calls.at(-1)?.level === 'floating'
  );

  windowControl.enableStealth();
  check('stealth pins the window above everything', calls.at(-1)?.level === 'screen-saver');

  calls.length = 0;
  windowControl.disableStealth();
  check(
    'leaving stealth restores the preference instead of clearing it',
    calls.some((c) => c.enabled === true && c.level === 'floating')
  );
  check('leaving stealth never sets always-on-top false', !calls.some((c) => c.enabled === false));
  check('the preference survives the round trip', configStore.getConfig().alwaysOnTop === true);

  calls.length = 0;
  windowControl.toggleAlwaysOnTop();
  check('toggling off persists', configStore.getConfig().alwaysOnTop === false);
  check('toggling off applies to the window', calls.at(-1)?.enabled === false);

  // A window pinned by stealth must not be un-pinned by a preference change mid-session.
  windowControl.enableStealth();
  calls.length = 0;
  windowControl.applyAlwaysOnTop();
  check('preference changes do not fight stealth mode', calls.length === 0);
  windowControl.disableStealth();

  calls.length = 0;
  windowControl.toggleAlwaysOnTop();
  check('toggling back on persists', configStore.getConfig().alwaysOnTop === true);
  check('toggling back on applies to the window', calls.at(-1)?.enabled === true);

  return failures;
}
