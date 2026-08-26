import { app, shell } from 'electron';

/**
 * Schemes `shell.openExternal` is allowed to hand to the operating system.
 *
 * openExternal delegates to the OS protocol handler, so `file:` launches whatever the path points
 * at and a registered custom scheme runs whatever claimed it. Only the three that mean "show this
 * to the user in their own application" are permitted.
 */
const OPENABLE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export function isOpenableExternally(url: string): boolean {
  try {
    return OPENABLE_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

/**
 * Open a URL in the user's own browser, or refuse it.
 *
 * Shared by the `external:open` IPC handler and the window-open handler below, so a link takes
 * the same route whether the renderer asked for it explicitly or a `target="_blank"` anchor did.
 */
export async function openExternally(url: string): Promise<{ success: boolean; error?: string }> {
  if (!url || typeof url !== 'string') return { success: false, error: 'invalid-url' };
  if (!isOpenableExternally(url)) {
    console.warn('[NavigationGuard] Refused to open a non-web URL:', url);
    return { success: false, error: 'unsupported-scheme' };
  }

  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err: unknown) {
    console.warn('[NavigationGuard] openExternal error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Keep the app's own web contents on the app.
 *
 * The panels render Markdown that came from a language model, and `remark-gfm` autolinks bare
 * URLs, so an anchor in this app is not necessarily one anybody wrote. Two things follow from
 * that, and neither was covered before.
 *
 * A `target="_blank"` anchor asks Electron for a new window, and with no handler installed the
 * default is to make one: a chromeless BrowserWindow, no address bar, showing a page the user did
 * not choose. Every one of those is denied and handed to the real browser instead, which is both
 * safer and what the user expected from a link.
 *
 * An anchor without a target navigates the frame it is in, and that frame is the app - carrying
 * the preload bridge with it, since preload runs on whatever document loads next. A remote page
 * inheriting `window.electronAPI` would have the session token through `config.get()` and the
 * candidate's CV through `account.get()`. `will-navigate` pins the window to the app's own
 * document; the dev server and the packaged `file://` bundle are the only origins it may hold.
 */
let installed = false;

export function installNavigationGuard(appUrl: string): void {
  // `createWindow()` runs again when the single-instance lock recovers a destroyed window, and
  // `web-contents-created` is an app-level event: without this the second call would stack a
  // duplicate will-navigate listener on every web contents for the rest of the process.
  if (installed) return;
  installed = true;

  let appOrigin: string;
  try {
    appOrigin = new URL(appUrl).origin;
  } catch {
    appOrigin = '';
  }

  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      // setImmediate, per Electron's own guidance: openExternal must not run inside the handler.
      if (isOpenableExternally(url)) {
        setImmediate(() => void openExternally(url));
      } else {
        console.warn('[NavigationGuard] Blocked a window for:', url);
      }
      return { action: 'deny' };
    });

    contents.on('will-navigate', (event, navigationUrl) => {
      let target: URL;
      try {
        target = new URL(navigationUrl);
      } catch {
        event.preventDefault();
        return;
      }

      // `file:` origins serialize to "null", so the packaged build is matched on the document it
      // is already showing rather than on an origin comparison that can never hold.
      const sameDocument =
        target.href === appUrl || (appOrigin !== '' && target.origin === appOrigin);
      if (sameDocument) return;

      event.preventDefault();
      console.warn('[NavigationGuard] Blocked navigation to:', navigationUrl);
      if (isOpenableExternally(navigationUrl)) {
        setImmediate(() => void openExternally(navigationUrl));
      }
    });
  });
}
