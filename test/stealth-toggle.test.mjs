/**
 * The taskbar button follows stealth mode: present in normal mode, gone in stealth. It cannot be
 * set once and left alone - hiding it is shell registration (`ITaskbarList::DeleteTab` on
 * Windows), not a window style, so it does not survive the style changes stealth mode makes
 * (`setFocusable` and the z-order level). Reported from a real run: the button came back after
 * switching out of stealth. Anything that reshapes or re-shows the window has to re-assert it.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('stealth-toggle');

  const windowControl = await loadMain('services/window-control.service.js');

  const alwaysOnTop = [];
  const skipTaskbar = [];
  const handlers = {};
  windowControl.setWindowReference({
    isDestroyed: () => false,
    on: (event, handler) => {
      handlers[event] = handler;
    },
    setAlwaysOnTop: (enabled, level) => alwaysOnTop.push({ enabled, level }),
    setSkipTaskbar: (skip) => skipTaskbar.push(skip),
    setWindowButtonVisibility: () => {},
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

  // Stealth is reset to off on load, so the app starts with an ordinary taskbar button.
  check('the window starts on the taskbar', skipTaskbar.at(-1) === false);

  skipTaskbar.length = 0;
  windowControl.enableStealth();
  check('stealth pins the window above everything', alwaysOnTop.at(-1)?.level === 'screen-saver');
  check('entering stealth takes the taskbar button away', skipTaskbar.at(-1) === true);

  // Most paths that re-show or re-shape the window are not ours to call - Alt+Tab restoring a
  // minimized window, the titlebar maximize button - so the events have to carry the fix.
  for (const event of ['show', 'restore', 'maximize', 'unmaximize']) {
    skipTaskbar.length = 0;
    handlers[event]?.();
    check(`the ${event} event keeps the button hidden in stealth`, skipTaskbar.at(-1) === true);
  }

  skipTaskbar.length = 0;
  windowControl.restoreWindow();
  check('restoring in stealth keeps the button hidden', skipTaskbar.at(-1) === true);

  alwaysOnTop.length = 0;
  skipTaskbar.length = 0;
  windowControl.disableStealth();
  check('leaving stealth drops always-on-top again', alwaysOnTop.at(-1)?.enabled === false);
  check('leaving stealth gives the taskbar button back', skipTaskbar.at(-1) === false);

  for (const event of ['show', 'restore', 'maximize', 'unmaximize']) {
    skipTaskbar.length = 0;
    handlers[event]?.();
    check(`the ${event} event keeps the button in normal mode`, skipTaskbar.at(-1) === false);
  }

  skipTaskbar.length = 0;
  windowControl.restoreWindow();
  check('restoring in normal mode keeps the button', skipTaskbar.at(-1) === false);

  // The reported bug only showed up after switching modes, so one pass either way proves little.
  // Cycle repeatedly and check the button tracks the mode every single time.
  let drifted = null;
  for (let i = 0; i < 10; i++) {
    windowControl.enableStealth();
    if (skipTaskbar.at(-1) !== true) drifted ??= `cycle ${i + 1} entering stealth`;
    windowControl.disableStealth();
    if (skipTaskbar.at(-1) !== false) drifted ??= `cycle ${i + 1} leaving stealth`;
    // A window event between toggles must not knock it out of step either.
    handlers.show?.();
    if (skipTaskbar.at(-1) !== false) drifted ??= `cycle ${i + 1} show event in normal mode`;
  }
  check(
    `10 stealth cycles keep the taskbar button in step${drifted ? ` (drifted at ${drifted})` : ''}`,
    drifted === null
  );

  return failures;
}
