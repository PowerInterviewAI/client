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

const MACHO_64 = 0xfeedfacf;
const MACHO_CPU = { 0x01000007: 'x64', 0x0100000c: 'arm64' };
const PE_MACHINE = { 0x8664: 'x64', 0xaa64: 'arm64' };

const failures = [];
const check = (name, ok) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}   ${name}`);
  if (!ok) failures.push(name);
};

function readArch(binary) {
  const fd = fs.openSync(binary, 'r');
  const head = Buffer.alloc(64);
  fs.readSync(fd, head, 0, 64, 0);
  try {
    if (head.readUInt32LE(0) === MACHO_64) return MACHO_CPU[head.readUInt32LE(4)] ?? null;
    if (head.toString('ascii', 0, 2) === 'MZ') {
      const peOffset = head.readUInt32LE(0x3c);
      const coff = Buffer.alloc(6);
      fs.readSync(fd, coff, 0, 6, peOffset);
      return PE_MACHINE[coff.readUInt16LE(4)] ?? null;
    }
    return null;
  } finally {
    fs.closeSync(fd);
  }
}

/** Every packaged app under `dir`, as { label, executable, resources }. */
function findApps(dir) {
  const apps = [];
  const walk = (current, depth) => {
    if (depth > 3) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(current, entry.name);
      if (entry.name.endsWith('.app')) {
        const macos = path.join(full, 'Contents', 'MacOS');
        const [binary] = fs.existsSync(macos) ? fs.readdirSync(macos) : [];
        if (binary) {
          apps.push({
            label: path.relative(dir, full),
            executable: path.join(macos, binary),
            resources: path.join(full, 'Contents', 'Resources'),
          });
        }
        continue;
      }
      if (entry.name.endsWith('-unpacked')) {
        const [exe] = fs.readdirSync(full).filter((f) => f.endsWith('.exe'));
        if (exe) {
          apps.push({
            label: path.relative(dir, full),
            executable: path.join(full, exe),
            resources: path.join(full, 'resources'),
          });
        }
        continue;
      }
      walk(full, depth + 1);
    }
  };
  walk(dir, 0);
  return apps;
}

function verify(app) {
  console.log(`\n# ${app.label}`);

  const arch = readArch(app.executable);
  const platform = app.executable.endsWith('.exe') ? 'win32' : 'darwin';
  check(`identifies the app as ${platform}-${arch}`, arch !== null);
  if (arch === null) return;

  const img = path.join(app.resources, 'app.asar.unpacked', 'node_modules', '@img');
  const nodeBinary = path.join(img, `sharp-${platform}-${arch}`, 'lib', `sharp-${platform}-${arch}.node`);

  const unpacked = fs.existsSync(nodeBinary);
  check(`unpacks sharp-${platform}-${arch}.node outside the asar`, unpacked);
  if (unpacked) {
    check('builds the binary for this architecture', readArch(nodeBinary) === arch);
  }

  // On macOS libvips lives in a sibling package reached via @loader_path/../../ from the
  // .node, so resolve it exactly the way dyld will rather than just asserting it exists.
  if (platform === 'darwin') {
    const rpath = path.join(path.dirname(nodeBinary), '..', '..', `sharp-libvips-darwin-${arch}`, 'lib');
    const dylibs = fs.existsSync(rpath) ? fs.readdirSync(rpath).filter((f) => f.endsWith('.dylib')) : [];
    check(`resolves libvips through the .node's @rpath (${dylibs.join(', ') || 'nothing found'})`, dylibs.length > 0);
  }

  // The real proof: load sharp out of the packaged asar with the packaged Electron and run
  // the operation the app actually performs. A foreign-arch artifact is still worth trying -
  // Rosetta runs the x64 build on the arm64 mac runner, which is the exact configuration that
  // shipped broken - so only give up when the kernel refuses the binary outright.
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
    if (arch !== process.arch && /Bad CPU type|Exec format error|ENOEXEC/i.test(detail)) {
      console.log(`  skip   runtime load test (host is ${process.arch}, artifact is ${arch}, no translation)`);
      return;
    }
    check(`loads and runs sharp from the packaged app`, false);
    for (const line of detail.split('\n')) console.error(`         ${line}`);
  }
}

const releaseDir = process.argv[2] ?? 'release';
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
