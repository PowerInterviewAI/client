/**
 * Stealth mode hides the window from screen capture, but the surfaces around it - a desktop
 * shortcut, a taskbar button, a Dock icon - are what a screen share exposes first. These are
 * one-line settings that a merge can silently flip back, and none of them show up until someone
 * builds an installer on the right OS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

import { createChecker } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('stealth-surface');

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  check('installer creates no desktop shortcut', pkg.build.nsis.createDesktopShortcut === false);
  check(
    'installer still creates a start menu shortcut',
    pkg.build.nsis.createStartMenuShortcut === true
  );
  check('packaged mac app is an accessory app', pkg.build.mac.extendInfo.LSUIElement === true);

  // createDesktopShortcut only covers fresh installs; upgrades have to delete the old icon.
  const nsh = fs.readFileSync(path.join(ROOT, 'build', 'installer.nsh'), 'utf8');
  check('upgrade deletes the previous desktop shortcut', /!macro customInstall/.test(nsh));
  check(
    'both recorded shortcut names are removed',
    /\$oldDesktopLink/.test(nsh) && /\$newDesktopLink/.test(nsh)
  );

  // Read the compiled output rather than the source: this is what actually ships.
  const main = fs.readFileSync(path.join(ROOT, 'electron-dist', 'index.js'), 'utf8');
  check('window is created with skipTaskbar', /skipTaskbar:\s*true/.test(main));
  check('dev runs get the accessory policy too', /setActivationPolicy\('accessory'\)/.test(main));

  // No taskbar button and no Dock icon: without these, closing or minimizing the window
  // leaves a running process with no way back to it.
  const onAllClosed = main.slice(main.indexOf("'window-all-closed'"));
  check(
    'closing the last window quits on every platform',
    /^[\s\S]{0,120}app\.quit\(\)/.test(onAllClosed) && !/^[\s\S]{0,120}darwin/.test(onAllClosed)
  );
  const hotkeys = fs.readFileSync(path.join(ROOT, 'electron-dist', 'hotkeys.js'), 'utf8');

  // The restore hotkey is gone: relaunching the app is the recovery path, and F8 is now free.
  check('no F8 shortcut is registered', !/\+F8/.test(hotkeys));

  // Stealth mode hides the control panel that carries the transcription toggle, so the hotkey
  // is the only route to it there. It takes both halves to work, and neither fails loudly.
  check('a transcript toggle hotkey is registered', /hotkey:toggle-transcript/.test(hotkeys));
  const preload = fs.readFileSync(path.join(ROOT, 'electron-dist', 'preload.cjs'), 'utf8');
  check('the renderer can subscribe to it', /hotkey:toggle-transcript/.test(preload));

  return failures;
}
