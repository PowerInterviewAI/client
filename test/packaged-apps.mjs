/**
 * Locating packaged apps in an electron-builder output directory, shared by the checks that
 * run against a build rather than against source.
 */
import fs from 'node:fs';
import path from 'node:path';

const MACHO_64 = 0xfeedfacf;
const MACHO_CPU = { 0x01000007: 'x64', 0x0100000c: 'arm64' };
const PE_MACHINE = { 0x8664: 'x64', 0xaa64: 'arm64' };

/** Architecture a Mach-O or PE binary was built for, or null if unrecognised. */
export function readArch(binary) {
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

/**
 * Every packaged app under `dir`, as { label, platform, arch, executable, resources }.
 *
 * Paths are absolute: callers hand them to require(), where a bare relative specifier would be
 * read as a package name rather than a location on disk.
 */
export function findApps(dir) {
  const root = path.resolve(dir);
  const apps = [];

  const add = (bundle, executable, resources) => {
    apps.push({
      label: path.relative(root, bundle),
      platform: executable.endsWith('.exe') ? 'win32' : 'darwin',
      arch: readArch(executable),
      executable,
      resources,
    });
  };

  const walk = (current, depth) => {
    if (depth > 3) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(current, entry.name);
      if (entry.name.endsWith('.app')) {
        const macos = path.join(full, 'Contents', 'MacOS');
        const [binary] = fs.existsSync(macos) ? fs.readdirSync(macos) : [];
        if (binary) {
          add(full, path.join(macos, binary), path.join(full, 'Contents', 'Resources'));
        }
        continue;
      }
      if (entry.name.endsWith('-unpacked')) {
        const [exe] = fs.readdirSync(full).filter((f) => f.endsWith('.exe'));
        if (exe) add(full, path.join(full, exe), path.join(full, 'resources'));
        continue;
      }
      walk(full, depth + 1);
    }
  };

  walk(root, 0);
  return apps;
}

/** Console reporter shared by the packaged checks. */
export function createChecker() {
  const failures = [];
  return {
    failures,
    check(name, ok) {
      console.log(`  ${ok ? 'ok  ' : 'FAIL'}   ${name}`);
      if (!ok) failures.push(name);
    },
    skip(name) {
      console.log(`  skip   ${name}`);
    },
  };
}
