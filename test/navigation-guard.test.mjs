/**
 * What the app's own web contents are allowed to navigate to, and what it hands to the OS.
 *
 * The panels render Markdown that came from a language model, and remark-gfm autolinks bare
 * URLs, so an anchor in this app is not necessarily one a person wrote. Nothing here is about
 * whether the model is hostile; it is about the app not having a route from generated text to
 * "launch this" that nobody chose to build.
 *
 * Three properties, each of which fails silently and looks like a working link:
 *
 * A `target="_blank"` anchor asks Electron for a new window, and with no handler installed the
 * default is to make one - a chromeless BrowserWindow with no address bar. Denied, and handed to
 * the real browser instead.
 *
 * An anchor with no target navigates the frame it is in, and that frame is the app. Preload runs
 * on whatever document loads next, so a remote page would inherit `window.electronAPI` and with
 * it the session token via `config.get()` and the candidate's CV via `account.get()`.
 *
 * And `shell.openExternal` delegates to the OS protocol handler, so `file:` launches whatever the
 * path points at. Only the three schemes that mean "show this to the user" get through.
 */
import { createChecker, loadMain } from './helpers.mjs';

const APP_URL = 'http://localhost:15173';

export async function run() {
  const { check, failures } = createChecker('navigation-guard');

  const electron = await import('electron');
  const { isOpenableExternally, openExternally, installNavigationGuard } =
    await loadMain('navigation-guard.js');

  check('http is openable', isOpenableExternally('http://example.com/docs'));
  check('https is openable', isOpenableExternally('https://example.com/docs'));
  check('mailto is openable', isOpenableExternally('mailto:support@example.com'));

  for (const url of [
    'file:///C:/Windows/System32/calc.exe',
    'file:///etc/passwd',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vscode://x',
    'ms-msdt:/id',
    'smb://server/share',
    'not a url',
    '',
  ]) {
    check(`refused: ${url || '(empty)'}`, !isOpenableExternally(url));
  }

  const before = electron.shell.openExternalCalls.length;
  const refused = await openExternally('file:///etc/passwd');
  check('openExternally reports the refusal', refused.success === false);
  check('and never reaches the OS handler', electron.shell.openExternalCalls.length === before);

  const allowed = await openExternally('https://example.com');
  check('an http url is opened', allowed.success === true);
  check(
    'and is the one handed over',
    electron.shell.openExternalCalls.at(-1) === 'https://example.com'
  );

  installNavigationGuard(APP_URL);

  let windowOpenHandler;
  const navigationHandlers = [];
  const contents = {
    setWindowOpenHandler: (handler) => {
      windowOpenHandler = handler;
    },
    on: (event, handler) => {
      if (event === 'will-navigate') navigationHandlers.push(handler);
    },
  };
  electron.app.emit('web-contents-created', {}, contents);

  check('a window-open handler is installed', typeof windowOpenHandler === 'function');
  check('a will-navigate handler is installed', navigationHandlers.length === 1);

  check(
    'every new window is denied, whatever the url',
    ['https://example.com', 'file:///etc/passwd', 'about:blank'].every(
      (url) => windowOpenHandler({ url }).action === 'deny'
    )
  );

  const navigate = (url) => {
    let prevented = false;
    navigationHandlers[0]({ preventDefault: () => (prevented = true) }, url);
    return prevented;
  };

  check('the app may navigate within its own origin', !navigate(`${APP_URL}/index.html`));
  check('an off-origin navigation is blocked', navigate('https://example.com'));
  check('a file url is blocked', navigate('file:///etc/passwd'));
  check('an unparseable url is blocked', navigate('not a url'));

  return failures;
}
