/**
 * The window is pinned above other windows unconditionally, and stealth mode pins it higher
 * still. The failure mode that matters is stealth mode clearing the property on its way out:
 * the user toggles stealth once, the window silently stops floating, and with no taskbar button
 * or Dock icon it is then easy to lose behind the meeting app.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('always-on-top');

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

  windowControl.applyAlwaysOnTop();
  check(
    'pins at the floating level, not the stealth level',
    calls.at(-1)?.enabled === true && calls.at(-1)?.level === 'floating'
  );

  windowControl.enableStealth();
  check('stealth pins the window above everything', calls.at(-1)?.level === 'screen-saver');

  calls.length = 0;
  windowControl.disableStealth();
  check(
    'leaving stealth re-pins the window',
    calls.some((c) => c.enabled === true && c.level === 'floating')
  );
  check('leaving stealth never unpins the window', !calls.some((c) => c.enabled === false));

  // Stealth owns the z-order while it is on; a stray re-apply must not drop the window
  // out from under it.
  windowControl.enableStealth();
  calls.length = 0;
  windowControl.applyAlwaysOnTop();
  check('re-applying does not fight stealth mode', calls.length === 0);
  windowControl.disableStealth();

  return failures;
}
