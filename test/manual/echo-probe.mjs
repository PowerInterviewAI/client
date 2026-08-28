/**
 * Manual measurement of how much of the interviewer's audio the microphone re-captures.
 *
 * When the candidate listens on speakers, the mic picks the interviewer up too, so the same words
 * arrive on both channels. `transcript.service.ts` attributes speaker purely by channel name, so
 * the echo is filed as the candidate - and a recent `Self` final is exactly what
 * `skipDueToRecentSelf` suppresses live suggestions on. The suppression is silent, which is what
 * makes it worth measuring rather than reasoning about.
 *
 * Nothing here gates or fixes anything. It reports three numbers, and the constants of any gate
 * built later have to be sized from them rather than guessed:
 *
 *   delayMs      arrival-order difference between the two channels, WITH ITS SIGN. Chromium's
 *                getDisplayMedia loopback path carries its own latency, and if it is the slower
 *                of the two, the reference arrives *after* the mic's echo of it. A gate that
 *                searched only 0..MAX would find no peak on precisely the machines that need it.
 *   correlation  peak height at that lag - what separates speakers from headphones.
 *   erlDb        how far below the reference the echo sits. Also the score for the A/B below.
 *
 * Not in `test/run.mjs`: it needs a desktop session, real speakers, and a person to play audio
 * into them. CI runs headless Linux.
 *
 *   cd client
 *   pnpm exec electron test/manual/echo-probe.mjs
 *   pnpm exec electron test/manual/echo-probe.mjs --seconds=60 --device="Microphone (Realtek)"
 *
 * The A/B the constraints work exists for - run each twice and compare `erlDb`:
 *
 *   pnpm exec electron test/manual/echo-probe.mjs --no-aec
 *   pnpm exec electron test/manual/echo-probe.mjs --no-agc
 *
 * Play a recorded interview through the speakers at a normal listening volume for the whole run,
 * and stay quiet - near-end speech is what poisons an ERL estimate.
 *
 * If `electron --version` prints a Node version rather than an Electron one, `ELECTRON_RUN_AS_NODE`
 * is set in your shell; clear it first.
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import loopbackPkg from 'electron-audio-loopback';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const options = {
  seconds: Number(value('seconds', 45)),
  device: value('device', ''),
  echoCancellation: !flag('--no-aec'),
  noiseSuppression: !flag('--no-ns'),
  autoGainControl: !flag('--no-agc'),
};

// Must run before the app is ready: it appends a Chromium feature switch as well as registering
// the two IPC handlers, and the switch is only read at startup.
loopbackPkg.initMain();

const num = (v, digits = 1) => (v === null || v === undefined ? '  --' : v.toFixed(digits));

let sawCoupling = false;

ipcMain.handle('probe:options', () => options);

ipcMain.on('probe:ready', (_event, info) => {
  console.log(`\nmicrophone : ${info.micLabel}`);
  console.log(
    `  requested: aec=${options.echoCancellation} ns=${options.noiseSuppression} agc=${options.autoGainControl}`
  );
  console.log(
    `  applied  : aec=${info.micSettings.echoCancellation} ns=${info.micSettings.noiseSuppression} agc=${info.micSettings.autoGainControl}`
  );
  console.log(`loopback   : ${info.loopbackTracks} audio track(s)`);
  console.log(
    `\nPlay interviewer audio through the speakers for ${options.seconds}s. Stay quiet.\n`
  );
  console.log('    delayMs   corr    erlDb   ref%   mic%   coupled');
  console.log('    -------   ----    -----   ----   ----   -------');
});

ipcMain.on('probe:metrics', (_event, m) => {
  if (m.coupled) sawCoupling = true;
  console.log(
    `    ${String(m.delayMs === null ? '--' : m.delayMs).padStart(7)}` +
      `   ${num(m.correlation, 2).padStart(4)}` +
      `   ${num(m.erlDb).padStart(6)}` +
      `   ${num(m.refActivePct, 0).padStart(4)}` +
      `   ${num(m.micActivePct, 0).padStart(4)}` +
      `   ${m.coupled ? 'yes' : 'no'}`
  );
});

ipcMain.on('probe:done', (_event, summary) => {
  console.log('\n=== summary ===');
  if (!summary.samples) {
    console.log('No correlated frames. Either this is a headphone setup (the good case), or no');
    console.log('audio was playing through the speakers during the run - check the ref% column.');
    console.log(`search window: ${summary.searchWindow[0]}..${summary.searchWindow[1]} ms`);
  } else {
    console.log(`accepted estimates : ${summary.samples}`);
    console.log(
      `delayMs            : median ${summary.delayMsMedian}, range ${summary.delayMsMin}..${summary.delayMsMax}`
    );
    console.log(`correlation        : median ${num(summary.correlationMedian, 2)}`);
    console.log(`erlDb              : median ${num(summary.erlDbMedian)}`);
    console.log(`search window      : ${summary.searchWindow[0]}..${summary.searchWindow[1]} ms`);

    const [lo, hi] = summary.searchWindow;
    if (summary.delayMsMedian <= lo + 50 || summary.delayMsMedian >= hi - 50) {
      console.log(
        '\nWARNING: the peak sits at the edge of the search window, so the true delay may'
      );
      console.log('lie outside it. Widen MIN_LAG_MS/MAX_LAG_MS in renderer.js and re-run before');
      console.log('treating this number as the real one.');
    }
    if (summary.delayMsMedian < 0) {
      console.log('\nNote: the delay is NEGATIVE - the loopback reference arrives after the mic');
      console.log('echo it explains. Any gate on this machine has to search signed lags and delay');
      console.log('the mic to keep its decisions causal.');
    }
  }
  console.log(
    `\ncoupling seen      : ${sawCoupling ? 'yes (speakers)' : 'no (headphones, or silence)'}`
  );
  app.quit();
});

ipcMain.on('probe:error', (_event, message) => {
  console.error('\nprobe failed:\n' + message);
  process.exitCode = 1;
  app.quit();
});

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 520,
    height: 200,
    title: 'Echo probe',
    webPreferences: {
      // A local, hand-run diagnostic that has to reach ipcRenderer from a plain script tag. The
      // shipped app does the opposite - see navigation-guard.ts - and nothing here loads remote
      // content.
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: false,
    },
  });

  await win.loadFile(path.join(HERE, 'echo-probe', 'index.html'));
});

app.on('window-all-closed', () => app.quit());
