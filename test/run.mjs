/**
 * Main-process checks. Run with `pnpm test:main` (builds electron-dist first).
 *
 * Deliberately dependency-free: these cover a couple of invariants that fail silently in
 * production (losing a not-yet-migrated CV, shipping one over IPC on a timer) and are not worth
 * pulling a test framework in for. Requires Node >= 22.15 for `module.registerHooks`.
 */
import fs from 'node:fs';

import { stubElectron } from './helpers.mjs';

// Must run before any module under test is imported.
const userDataDir = stubElectron();

const failures = [];
for (const module of [
  './config-store.test.mjs',
  './app-state.test.mjs',
  './account.test.mjs',
  './stealth-surface.test.mjs',
  './stealth-toggle.test.mjs',
  './stealth-dock.test.mjs',
  // After the stealth tests: it drives the shared appStateService singleton, and the dock test
  // reads the same running state through its own copy of window-control.
  './running-surface.test.mjs',
  './tools-export.test.mjs',
  './suggestion-sentinel.test.mjs',
  './mac-update-util.test.mjs',
]) {
  const { run } = await import(module);
  failures.push(...(await run(userDataDir)));
}

fs.rmSync(userDataDir, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\nAll checks passed.');
