/**
 * Manual, Windows-only end-to-end check of the taskbar button across stealth toggles.
 *
 * `test/stealth-toggle.test.mjs` can only prove we call `setSkipTaskbar` with the right argument.
 * Whether the shell acts on it is the part that actually broke before, and it fails silently -
 * no exception, no log. This drives the real compiled service in a real Electron process and
 * reads the taskbar back through UI Automation.
 *
 * Not in `test/run.mjs`: it needs a Windows desktop session, and CI runs headless Linux.
 *
 *   cd client
 *   pnpm electron:build-main
 *   pnpm exec electron test/manual/taskbar-probe.mjs
 *
 * If `electron --version` prints a Node version rather than an Electron one, `ELECTRON_RUN_AS_NODE`
 * is set in your shell; clear it first.
 */
import { app, BrowserWindow } from 'electron';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SERVICE = new URL(
  `file:///${path
    .join(ROOT, 'electron-dist', 'services', 'window-control.service.js')
    .replace(/\\/g, '/')}`
).href;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Windows groups every Electron app under a single taskbar button (they share an
 * AppUserModelID), so a second Electron app running on the machine would hide our button behind
 * its own. Count the windows the button reports rather than the buttons themselves, and measure
 * against a baseline taken before our window exists.
 */
function electronWindowsOnTaskbar() {
  const out = execFileSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(HERE, 'taskbar-buttons.ps1')],
    { encoding: 'utf8' }
  );
  let total = 0;
  for (const m of out.matchAll(/Electron - (\d+) running window/g)) total += Number(m[1]);
  return total;
}

let baseline = 0;
const results = [];

function probe(label, expectPresent) {
  const n = electronWindowsOnTaskbar();
  const present = n > baseline;
  const ok = present === expectPresent;
  results.push(ok);
  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'} ${label}: taskbar button ${present ? 'present' : 'absent'}` +
      ` (expected ${expectPresent ? 'present' : 'absent'}, electron windows ${n}/${baseline})`
  );
}

app.commandLine.appendSwitch('force-device-scale-factor', '1');

app.whenReady().then(async () => {
  if (process.platform !== 'win32') {
    console.log('taskbar-probe: Windows only, skipping.');
    app.exit(0);
    return;
  }

  console.log('\n# taskbar-probe');
  baseline = electronWindowsOnTaskbar();

  const { setWindowReference, enableStealth, disableStealth } = await import(SERVICE);

  const win = new BrowserWindow({ x: 40, y: 40, width: 460, height: 260, title: 'PROBE WINDOW' });
  win.loadURL('data:text/html,<body style="font:700 28px sans-serif;padding:24px">PROBE</body>');
  win.show();

  setWindowReference(win);
  await sleep(1500);
  probe('the window starts on the taskbar', true);

  // One pass proves little - the reported bug only appeared after switching modes.
  for (let cycle = 1; cycle <= 3; cycle++) {
    enableStealth();
    await sleep(1200);
    probe(`cycle ${cycle}: stealth takes the button away`, false);

    disableStealth();
    await sleep(1200);
    probe(`cycle ${cycle}: leaving stealth gives it back`, true);
  }

  // The sequence a user produces by mashing the stealth hotkey.
  enableStealth();
  disableStealth();
  enableStealth();
  await sleep(2500);
  probe('rapid toggles settling in stealth: absent', false);

  disableStealth();
  await sleep(2500);
  probe('rapid toggles settling in normal mode: present', true);

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  app.exit(passed === results.length ? 0 : 1);
});
