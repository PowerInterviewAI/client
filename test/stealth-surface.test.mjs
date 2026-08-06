/**
 * Stealth mode hides the window from screen capture, but the surfaces around it - a desktop
 * shortcut, a taskbar button - are what a screen share exposes first. Both are one-line settings
 * that a merge can silently flip back, and neither shows up until someone ships an installer.
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
  check('installer still creates a start menu shortcut', pkg.build.nsis.createStartMenuShortcut === true);

  // Read the compiled output rather than the source: this is what actually ships.
  const main = fs.readFileSync(path.join(ROOT, 'electron-dist', 'index.js'), 'utf8');
  check('window is created with skipTaskbar', /skipTaskbar:\s*true/.test(main));

  // With no taskbar button, the Minimize button in the titlebar is a one-way door without this.
  const hotkeys = fs.readFileSync(path.join(ROOT, 'electron-dist', 'hotkeys.js'), 'utf8');
  check('a restore hotkey is registered', /restoreWindow\(\)/.test(hotkeys));

  return failures;
}
