/**
 * Test helpers for exercising main-process modules outside Electron.
 *
 * The modules under test import `electron`, which only resolves inside an Electron process, so
 * `stubElectron()` installs a module hook that serves a minimal stand-in. Call it before the
 * first `loadMain()`. Plain Node, no test framework - see test/run.mjs.
 */
import { registerHooks } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIST = path.resolve(fileURLToPath(new URL('../electron-dist', import.meta.url)));

/** Serves a fake `electron` whose userData path points at a throwaway directory. */
export function stubElectron() {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'pia-test-'));

  registerHooks({
    resolve(specifier, context, next) {
      if (specifier === 'electron') return { url: 'stub:electron', shortCircuit: true };
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url !== 'stub:electron') return next(url, context);
      return {
        format: 'module',
        shortCircuit: true,
        source: `
const app = {
  getPath: () => ${JSON.stringify(userData)},
  getName: () => 'pia-test',
  getVersion: () => '0.0.0',
  on: () => {},
  whenReady: () => Promise.resolve(),
};
const ipcMain = { on: () => {}, handle: () => {} };
const screen = { getPrimaryDisplay: () => ({ workAreaSize: { width: 1920, height: 1080 } }), getAllDisplays: () => [] };
const shell = { openPath: async () => '' };
export { app, ipcMain, screen, shell };
export default { app, ipcMain, screen, shell };`,
      };
    },
  });

  return userData;
}

/** Import a compiled main-process module by its path under electron-dist/. */
export function loadMain(relativePath) {
  return import(pathToFileURL(path.join(DIST, relativePath)).href);
}

export function createChecker(name) {
  const failures = [];
  console.log(`\n# ${name}`);
  return {
    check(label, condition) {
      console.log(`${condition ? '  ok  ' : '  FAIL'} ${label}`);
      if (!condition) failures.push(`${name}: ${label}`);
    },
    failures,
  };
}
