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
// Records every Dock/activation-policy call in order so the macOS surface can be asserted on
// any platform. See test/stealth-dock.test.mjs.
const dockCalls = [];
// Every app.on(...) registration, so a test can fire the event the module under test is
// waiting for. See test/navigation-guard.test.mjs.
const appListeners = new Map();
const app = {
  getPath: () => ${JSON.stringify(userData)},
  getName: () => 'pia-test',
  getVersion: () => '0.0.0',
  on: (event, handler) => {
    if (!appListeners.has(event)) appListeners.set(event, []);
    appListeners.get(event).push(handler);
  },
  emit: (event, ...args) => {
    for (const handler of appListeners.get(event) ?? []) handler(...args);
  },
  appListeners,
  whenReady: () => Promise.resolve(),
  setActivationPolicy: (policy) => dockCalls.push(policy),
  dock: {
    show: async () => { dockCalls.push('dock.show'); },
    hide: () => { dockCalls.push('dock.hide'); },
  },
  dockCalls,
};
const ipcMain = { on: () => {}, handle: () => {} };
const screen = { getPrimaryDisplay: () => ({ workAreaSize: { width: 1920, height: 1080 } }), getAllDisplays: () => [] };
// Records what was handed to the OS, so a test can assert that a blocked scheme never reaches it.
const openExternalCalls = [];
const shell = {
  openPath: async () => '',
  openExternal: async (url) => { openExternalCalls.push(url); },
  openExternalCalls,
  showItemInFolder: () => {},
};
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

/**
 * Import a fresh copy of a compiled module while `process.platform` reports `platform`.
 *
 * The macOS-only branches read `process.platform` once at module scope, so they are dead code on
 * the Linux runner CI uses - which is exactly where the Dock behaviour would go unnoticed. The
 * ESM cache is keyed by URL, so a query string yields a second, separately initialised instance;
 * its own relative imports carry no query and keep sharing the already-loaded singletons.
 */
export async function loadMainAs(platform, relativePath) {
  const original = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
  try {
    const url = `${pathToFileURL(path.join(DIST, relativePath)).href}?platform=${platform}`;
    return await import(url);
  } finally {
    Object.defineProperty(process, 'platform', original);
  }
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

/**
 * Read a source file for the source-level checks, with line endings normalised.
 *
 * `core.autocrlf` is true and there is no `.gitattributes`, so a checkout on Windows - which is
 * where this project is developed - materialises these files with CRLF while CI materialises
 * them with LF. Any anchor containing a literal newline therefore matches on the runner and
 * fails on the developer's machine, which is the worst direction for it to fail in: green CI,
 * and a suite that looks broken to whoever just pulled.
 *
 * Normalised on read rather than making each matcher line-ending aware, because the matchers are
 * written against the source as it reads on screen and that is the useful thing about them.
 */
export function readSource(url) {
  return fs.readFileSync(url, 'utf8').replace(/\r\n?/g, '\n');
}

/**
 * Strip comments from TypeScript source before matching against it.
 *
 * The source-level checks in this directory forbid patterns that the code's own comments
 * describe in prose, so a naive substring search finds the explanation rather than the code and
 * fails on a correct implementation.
 */
export function codeOnly(source) {
  // `.` already excludes newlines in JS, so the line-comment pattern needs no escape for one.
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}

/** The body of the method whose signature starts with `signature`, braces included, or ''. */
export function methodBody(source, signature) {
  const start = source.indexOf(signature);
  if (start === -1) return '';

  // Walk braces from the signature's opening brace to its match.
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return '';
}
