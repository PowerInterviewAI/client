/**
 * Pure helpers behind the macOS manual-download update flow (auto-updater.service.ts).
 * No Electron stub needed - mac-update.util.ts has no electron import.
 */
import { createChecker, loadMain } from './helpers.mjs';

export async function run() {
  const { check, failures } = createChecker('mac-update-util');

  const { isNewerVersion, pickMacAsset } = await loadMain('utils/mac-update.util.js');

  check('newer patch version is newer', isNewerVersion('1.6.3', '1.6.2') === true);
  check('newer minor version is newer', isNewerVersion('1.7.0', '1.6.9') === true);
  check('newer major version is newer', isNewerVersion('2.0.0', '1.9.9') === true);
  check('older version is not newer', isNewerVersion('1.6.1', '1.6.2') === false);
  check('equal version is not newer', isNewerVersion('1.6.2', '1.6.2') === false);
  check(
    'extra trailing segment counts as newer',
    isNewerVersion('1.6.2.1', '1.6.2') === true
  );

  // A release (no suffix) outranks a pre-release of the same numeric core, per semver.
  check(
    'a release is newer than a pre-release of the same core',
    isNewerVersion('1.7.0', '1.7.0-beta.1') === true
  );
  check(
    'a pre-release is not newer than the release it precedes',
    isNewerVersion('1.7.0-beta.1', '1.7.0') === false
  );
  check(
    'a newer pre-release core still outranks an older release',
    isNewerVersion('1.7.0-beta.1', '1.6.9') === true
  );
  check(
    'later pre-release identifiers are newer than earlier ones',
    isNewerVersion('1.7.0-beta.2', '1.7.0-beta.1') === true
  );
  check(
    'identical pre-release tags are not newer',
    isNewerVersion('1.7.0-beta.1', '1.7.0-beta.1') === false
  );

  const assets = [
    {
      name: 'Power Interview AI-1.6.3-arm64.dmg',
      browser_download_url: 'https://example.com/arm64.dmg',
      digest: 'sha256:arm64digest',
    },
    {
      name: 'Power Interview AI-1.6.3-x64.dmg',
      browser_download_url: 'https://example.com/x64.dmg',
      digest: 'sha256:x64digest',
    },
    { name: 'Power Interview AI-1.6.3-arm64-mac.zip', browser_download_url: 'https://example.com/arm64.zip' },
    { name: 'Power Interview AI-1.6.3-x64-mac.zip', browser_download_url: 'https://example.com/x64.zip' },
  ];

  const arm64Pick = pickMacAsset(assets, 'arm64');
  check('picks the arm64 dmg, not the zip', arm64Pick?.url === 'https://example.com/arm64.dmg');
  check('carries the digest through for verification', arm64Pick?.digest === 'sha256:arm64digest');

  const x64Pick = pickMacAsset(assets, 'x64');
  check('picks the x64 dmg, not the zip', x64Pick?.url === 'https://example.com/x64.dmg');

  check('returns null when no asset matches the arch', pickMacAsset(assets, 'ia32') === null);
  check('returns null for an empty asset list', pickMacAsset([], 'arm64') === null);

  const noDigestPick = pickMacAsset(
    [{ name: 'Power Interview AI-1.6.3-arm64.dmg', browser_download_url: 'https://example.com/arm64.dmg' }],
    'arm64'
  );
  check('defaults digest to null when GitHub has not provided one', noDigestPick?.digest === null);

  return failures;
}
