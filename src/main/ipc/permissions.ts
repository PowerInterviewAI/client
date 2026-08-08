import { app, ipcMain, shell, systemPreferences } from 'electron';

// macOS caches the Screen Recording grant per-process: a grant made in System Settings
// while the app is running is visible immediately via getMediaAccessStatus, but the process
// itself stays unauthorized for actual capture until relaunched. Starting a ScreenCaptureKit/
// CoreAudioTap system-audio capture in that gap doesn't fail cleanly on every macOS build -
// it can crash coreaudiod or the audio HAL. Snapshot the status this process launched with so
// a same-session flip to 'granted' can be told apart from a grant that predates this launch.
const screenGrantedAtLaunch =
  process.platform === 'darwin'
    ? systemPreferences.getMediaAccessStatus('screen') === 'granted'
    : true;

export function registerPermissionHandlers(): void {
  ipcMain.handle('permissions:check-all', () => {
    if (process.platform !== 'darwin') {
      return { mic: 'granted', screen: 'granted', screenNeedsRelaunch: false };
    }
    const screen = systemPreferences.getMediaAccessStatus('screen');
    return {
      mic: systemPreferences.getMediaAccessStatus('microphone'),
      screen,
      screenNeedsRelaunch: screen === 'granted' && !screenGrantedAtLaunch,
    };
  });

  ipcMain.handle('permissions:request-microphone', async () => {
    if (process.platform !== 'darwin') return true;
    return systemPreferences.askForMediaAccess('microphone');
  });

  ipcMain.handle('permissions:open-settings', async (_event, pane: 'microphone' | 'screen') => {
    const urls: Record<string, string> = {
      microphone:
        'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
      screen:
        'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
    };
    if (urls[pane]) await shell.openExternal(urls[pane]).catch(() => {});
  });

  // macOS only applies a freshly-granted Screen Recording permission after the
  // app is relaunched, so the first capture otherwise fails silently.
  ipcMain.handle('permissions:relaunch', () => {
    app.relaunch();
    app.exit(0);
  });
}
