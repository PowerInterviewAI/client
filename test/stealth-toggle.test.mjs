/**
 * Hiding the taskbar button is shell registration (`ITaskbarList::DeleteTab` on Windows), not a
 * window style, so it does not survive the style changes stealth mode makes - `setFocusable` and
 * the z-order level. Reported from a real run: the button came back after switching out of
 * stealth. Anything that reshapes or re-shows the window has to re-assert it.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('stealth-toggle');

  const windowControl = await loadMain('services/window-control.service.js');

  const alwaysOnTop = [];
  const skipTaskbar = [];
  windowControl.setWindowReference({
    isDestroyed: () => false,
    setAlwaysOnTop: (enabled, level) => alwaysOnTop.push({ enabled, level }),
    setSkipTaskbar: (skip) => skipTaskbar.push(skip),
    setVisibleOnAllWorkspaces: () => {},
    setIgnoreMouseEvents: () => {},
    setFocusable: () => {},
    setOpacity: () => {},
    isMinimized: () => false,
    isVisible: () => true,
    show: () => {},
    showInactive: () => {},
    focus: () => {},
    restore: () => {},
    webContents: { send: () => {} },
  });

  windowControl.enableStealth();
  check('stealth pins the window above everything', alwaysOnTop.at(-1)?.level === 'screen-saver');
  check('entering stealth keeps the taskbar button hidden', skipTaskbar.at(-1) === true);

  alwaysOnTop.length = 0;
  skipTaskbar.length = 0;
  windowControl.disableStealth();
  check('leaving stealth drops always-on-top again', alwaysOnTop.at(-1)?.enabled === false);
  check('leaving stealth hides the taskbar button again', skipTaskbar.at(-1) === true);

  skipTaskbar.length = 0;
  windowControl.restoreWindow();
  check('restoring hides the taskbar button again', skipTaskbar.at(-1) === true);

  return failures;
}
