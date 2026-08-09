/**
 * Release gate: every packaged app must carry sharp's native binary for its own architecture.
 *
 * pnpm materialises only the host architecture's optional dependencies, so `electron-builder
 * --mac` on an arm64 runner produces an x64 artifact with no darwin-x64 binary. It builds
 * clean, uploads clean, and throws "Could not load the sharp module" on first launch. The
 * dylib half fails the same way: libvips ships in a sibling package that sharp's .node finds
 * through an @rpath, so both must be unpacked from the asar or dlopen cannot reach it.
 *
 * Run against the electron-builder output directory: node test/verify-packaged-sharp.mjs release
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { createChecker, findApps, readArch } from './packaged-apps.mjs';

const { check, skip, failures } = createChecker();

function verify(app) {
  console.log(`\n# ${app.label}`);

  check(`identifies the app as ${app.platform}-${app.arch}`, app.arch !== null);
  if (app.arch === null) return;

  const img = path.join(app.resources, 'app.asar.unpacked', 'node_modules', '@img');
  const name = `sharp-${app.platform}-${app.arch}`;
  const nodeBinary = path.join(img, name, 'lib', `${name}.node`);

  const unpacked = fs.existsSync(nodeBinary);
  check(`unpacks ${name}.node outside the asar`, unpacked);
  if (unpacked) {
    check('builds the binary for this architecture', readArch(nodeBinary) === app.arch);
  }

  if (app.platform === 'darwin') {
    // libvips lives in a sibling package reached via @loader_path/../../ from the .node, so
    // resolve it the way dyld will rather than just asserting the directory exists.
    const rpath = path.join(path.dirname(nodeBinary), '..', '..', `sharp-libvips-darwin-${app.arch}`, 'lib');
    const dylibs = fs.existsSync(rpath) ? fs.readdirSync(rpath).filter((f) => f.endsWith('.dylib')) : [];
    check(`resolves libvips through the .node's @rpath (${dylibs.join(', ') || 'nothing found'})`, dylibs.length > 0);

    // Unpacking moves these out of the asar and into the bundle as real Mach-O files. arm64
    // refuses to load any that the bundle signature does not cover.
    if (process.platform === 'darwin') {
      try {
        execFileSync('codesign', ['--verify', '--deep', '--strict', path.join(app.resources, '..', '..')], {
          stdio: 'pipe',
        });
        check('bundle signature covers the unpacked native binaries', true);
      } catch (error) {
        check('bundle signature covers the unpacked native binaries', false);
        console.error(`         ${(error.stderr || error.message).toString().trim()}`);
      }
    } else {
      skip('codesign verification (not running on macOS)');
    }
  }

  // The real proof: load sharp out of the packaged asar with the packaged Electron and run the
  // operation the app actually performs. A foreign-arch artifact is still worth trying - Rosetta
  // runs the x64 build on the arm64 mac runner, which is the exact configuration that shipped
  // broken - so only give up when the kernel refuses the binary outright.
  try {
    const output = execFileSync(
      app.executable,
      [
        '-e',
        `const sharp = require(process.argv[1]);
         sharp({ create: { width: 8, height: 8, channels: 3, background: '#f00' } })
           .grayscale().png().toBuffer()
           .then((b) => console.log('OK ' + sharp.versions.sharp + ' ' + b.length))
           .catch((e) => { console.error(e); process.exit(1); });`,
        path.join(app.resources, 'app.asar', 'node_modules', 'sharp'),
      ],
      { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, encoding: 'utf8', stdio: 'pipe' }
    );
    check(`loads and runs sharp from the packaged app (${output.trim()})`, output.includes('OK '));
  } catch (error) {
    const detail = (error.stderr || error.message).toString().trim();
    if (app.arch !== process.arch && /Bad CPU type|Exec format error|ENOEXEC/i.test(detail)) {
      skip(`runtime load test (host is ${process.arch}, artifact is ${app.arch}, no translation)`);
      return;
    }
    check('loads and runs sharp from the packaged app', false);
    for (const line of detail.split('\n')) console.error(`         ${line}`);
  }
}

const releaseDir = path.resolve(process.argv[2] ?? 'release');
if (!fs.existsSync(releaseDir)) {
  console.error(`No such directory: ${releaseDir}`);
  process.exit(1);
}

const apps = findApps(releaseDir);
if (apps.length === 0) {
  console.error(`No packaged app found under ${releaseDir}`);
  process.exit(1);
}

for (const app of apps) verify(app);

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log('\nAll packaged native dependency checks passed.');
