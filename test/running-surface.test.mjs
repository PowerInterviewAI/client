/**
 * The taskbar button, the Dock icon and always-on-top follow `stealth OR running`, not stealth
 * alone. A running assistant is exactly when a screen share is most likely to be live, and when
 * suggestions are useless if the call window covers them.
 *
 * The trap this pins is that the two inputs are independent, not nested. Leaving stealth while a
 * session is still running used to be the only path through `disableStealth`, which dropped
 * always-on-top and handed the taskbar button back unconditionally - so the window would surface
 * itself mid-interview. Nothing about that fails loudly.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('running-surface');

  const windowControl = await loadMain('services/window-control.service.js');
  const { appStateService } = await loadMain('services/app-state.service.js');
  const { RunningState } = await loadMain('types/app-state.js');

  const alwaysOnTop = [];
  const skipTaskbar = [];
  const workspaces = [];
  // One ordered log across both calls, so the sequence between them can be asserted.
  const order = [];
  const handlers = {};
  windowControl.setWindowReference({
    isDestroyed: () => false,
    on: (event, handler) => {
      handlers[event] = handler;
    },
    setAlwaysOnTop: (enabled, level) => {
      alwaysOnTop.push({ enabled, level });
      order.push('alwaysOnTop');
    },
    setSkipTaskbar: (skip) => {
      skipTaskbar.push(skip);
      order.push('skipTaskbar');
    },
    setWindowButtonVisibility: () => {},
    setVisibleOnAllWorkspaces: (on, opts) => workspaces.push({ on, opts }),
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

  const start = () => appStateService.updateState({ runningState: RunningState.Running });
  const stop = () => appStateService.updateState({ runningState: RunningState.Idle });

  check('idle out of stealth keeps the taskbar button', skipTaskbar.at(-1) === false);
  check('idle out of stealth is not pinned on top', alwaysOnTop.at(-1)?.enabled === false);

  // 1. Running alone, no stealth involved.
  skipTaskbar.length = 0;
  alwaysOnTop.length = 0;
  workspaces.length = 0;
  start();
  check('starting the assistant takes the taskbar button away', skipTaskbar.at(-1) === true);
  check('starting the assistant pins the window on top', alwaysOnTop.at(-1)?.enabled === true);
  check(
    'and pins it above the Dock and taskbar, not below',
    alwaysOnTop.at(-1)?.level === 'screen-saver'
  );
  // Always-on-top alone does not show over a fullscreen Space, which is how a call usually runs.
  check('and makes it visible over a fullscreen call', workspaces.at(-1)?.on === true);
  check('with visibleOnFullScreen set', workspaces.at(-1)?.opts?.visibleOnFullScreen === true);

  // Z-order changes re-register the window with the shell and hand the taskbar button back, so
  // setSkipTaskbar has to be the later of the two. Reversing them looks harmless and silently
  // leaves the button on screen.
  check(
    'the taskbar button is asserted after the z-order change',
    order.lastIndexOf('skipTaskbar') > order.lastIndexOf('alwaysOnTop')
  );

  // 2. The window events that re-register the button must respect the running input too.
  for (const event of ['show', 'restore', 'maximize', 'unmaximize']) {
    skipTaskbar.length = 0;
    handlers[event]?.();
    check(`the ${event} event keeps the button hidden while running`, skipTaskbar.at(-1) === true);
  }

  skipTaskbar.length = 0;
  windowControl.restoreWindow();
  check('restoring while running keeps the button hidden', skipTaskbar.at(-1) === true);

  // 3. Stealth on top of running, then off again while still running. This is the regression:
  //    disableStealth must not undo what the running session is asking for.
  //    (The macOS traffic lights are covered in stealth-dock.test.mjs, which runs as darwin -
  //    setWindowButtonVisibility is never reached on this platform.)
  windowControl.enableStealth();

  skipTaskbar.length = 0;
  alwaysOnTop.length = 0;
  windowControl.disableStealth();
  check('leaving stealth mid-session keeps the button hidden', skipTaskbar.at(-1) === true);
  check(
    'leaving stealth mid-session keeps the window pinned',
    alwaysOnTop.at(-1)?.enabled === true
  );

  // 4. Stopping is what releases both.
  skipTaskbar.length = 0;
  alwaysOnTop.length = 0;
  workspaces.length = 0;
  stop();
  check('stopping the assistant gives the taskbar button back', skipTaskbar.at(-1) === false);
  check('stopping the assistant unpins the window', alwaysOnTop.at(-1)?.enabled === false);
  check('and stops following the user across Spaces', workspaces.at(-1)?.on === false);

  // 5. Stealth still works on its own with no session running.
  skipTaskbar.length = 0;
  alwaysOnTop.length = 0;
  windowControl.enableStealth();
  check('stealth alone still hides the button', skipTaskbar.at(-1) === true);
  check('stealth alone still pins the window', alwaysOnTop.at(-1)?.level === 'screen-saver');
  windowControl.disableStealth();
  check('leaving stealth with no session gives the button back', skipTaskbar.at(-1) === false);
  check('leaving stealth with no session unpins', alwaysOnTop.at(-1)?.enabled === false);

  // 6. Repeated identical updates must not thrash the window. Only transitions do work.
  start();
  const settled = skipTaskbar.length;
  appStateService.updateState({ runningState: RunningState.Running });
  appStateService.updateState({ runningState: RunningState.Running });
  check('re-reporting the same running state changes nothing', skipTaskbar.length === settled);
  stop();

  // 7. Intermediate states are not "running" - Starting and Stopping must not pin the window.
  skipTaskbar.length = 0;
  appStateService.updateState({ runningState: RunningState.Starting });
  check('Starting does not hide the button yet', skipTaskbar.at(-1) !== true);
  appStateService.updateState({ runningState: RunningState.Running });
  skipTaskbar.length = 0;
  appStateService.updateState({ runningState: RunningState.Stopping });
  check('Stopping releases the button', skipTaskbar.at(-1) === false);
  appStateService.updateState({ runningState: RunningState.Idle });

  return failures;
}
