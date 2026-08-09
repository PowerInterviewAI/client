/**
 * Launches each packaged app for real and fails if the main process dies or reports an
 * uncaught exception.
 *
 * verify-packaged-sharp.mjs loads sharp through ELECTRON_RUN_AS_NODE, which proves the binary
 * resolves but never starts Electron proper. A native module that is missing, built for the
 * wrong architecture, or unsigned takes the app down at startup instead - the failure users
 * actually see, as a "A JavaScript error occurred in the main process" dialog. That dialog also
 * keeps the process alive, so staying up is not on its own evidence of health and the output
 * has to be checked too.
 *
 * Run against the electron-builder output directory: node test/smoke-packaged-launch.mjs release
 */
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';

import { createChecker, findApps } from './packaged-apps.mjs';

const SETTLE_MS = 20000;
const FATAL = /Uncaught Exception|A JavaScript error occurred|Cannot find module|dlopen|code signature|Could not load the "sharp" module/i;

const { check, skip, failures } = createChecker();

function launch(app) {
  return new Promise((resolve) => {
    // No extra CLI flags: a packaged Electron binary rejects unrecognised leading-dash options
    // outright, so anything passed here would test the launcher rather than the app.
    const child = spawn(app.executable, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
      // Own process group, so teardown can take Electron's GPU and renderer children with it.
      detached: process.platform !== 'win32',
    });

    const startedAt = Date.now();
    let output = '';
    let exited = null;
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    child.on('error', (e) => (output += `spawn error: ${e.message}\n`));
    child.on('exit', (code, signal) => (exited = { code, signal, afterMs: Date.now() - startedAt }));

    setTimeout(() => {
      const alive = exited === null;
      // Electron's children outlive a kill aimed at the parent alone, and a survivor holds the
      // single instance lock - which makes the *next* app under test quit immediately and look
      // like a failure. Tear down the whole tree.
      if (alive) {
        try {
          if (process.platform === 'win32') {
            execFileSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
          } else {
            process.kill(-child.pid, 'SIGKILL');
          }
        } catch {
          child.kill('SIGKILL');
        }
      }
      setTimeout(() => resolve({ output, exited: alive ? null : exited }), 1500);
    }, SETTLE_MS);
  });
}

const releaseDir = path.resolve(process.argv[2] ?? 'release');
const apps = findApps(releaseDir);
if (apps.length === 0) {
  console.error(`No packaged app found under ${releaseDir}`);
  process.exit(1);
}

for (const app of apps) {
  console.log(`\n# ${app.label} (${app.platform}-${app.arch})`);

  const { output, exited } = await launch(app);
  const fatal = output.match(FATAL);

  if (exited && /Bad CPU type|Exec format error|ENOEXEC/i.test(output)) {
    skip(`launch (host is ${process.arch}, artifact is ${app.arch}, no translation available)`);
    continue;
  }

  check('starts without an uncaught exception in the main process', fatal === null);
  check('main process is still running after startup', exited === null);

  if (fatal !== null || exited !== null) {
    if (exited) {
      console.error(`         exited: code=${exited.code} signal=${exited.signal} after ${exited.afterMs}ms`);
      // The single instance lock is the only path that quits this cleanly this early, and it
      // means something else on the machine already holds it rather than the build being bad.
      if (exited.code === 0 && exited.afterMs < 2000) {
        console.error('         quit immediately with no error: another instance likely holds the single instance lock');
      }
    }
    for (const line of output.trim().split('\n').slice(-25)) console.error(`         ${line}`);
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\nAll packaged apps launched cleanly.');
