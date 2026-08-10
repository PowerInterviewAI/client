// Pure helpers for the macOS manual-download update flow (see auto-updater.service.ts).
// No Electron imports here on purpose - keeps this directly unit-testable.

// Splits a version into its numeric core (e.g. "1.6.3") and an optional pre-release
// suffix (e.g. "beta.1" from "1.6.3-beta.1"). A version with a pre-release suffix is
// considered older than the same numeric core without one (per semver precedence rules).
function parseVersion(version: string): { core: number[]; prerelease: string | null } {
  const [core, ...rest] = version.split('-');
  const prerelease = rest.length > 0 ? rest.join('-') : null;
  const coreParts = core.split('.').map((part) => {
    const num = Number(part);
    return Number.isFinite(num) ? num : 0;
  });

  return { core: coreParts, prerelease };
}

export function isNewerVersion(remote: string, current: string): boolean {
  const remoteVersion = parseVersion(remote);
  const currentVersion = parseVersion(current);
  const length = Math.max(remoteVersion.core.length, currentVersion.core.length);

  for (let i = 0; i < length; i++) {
    const remotePart = remoteVersion.core[i] ?? 0;
    const currentPart = currentVersion.core[i] ?? 0;
    if (remotePart !== currentPart) {
      return remotePart > currentPart;
    }
  }

  if (remoteVersion.prerelease === currentVersion.prerelease) {
    return false;
  }

  // Same numeric core: a release (no pre-release suffix) is newer than a pre-release,
  // and pre-release identifiers are compared lexically as a fallback.
  if (remoteVersion.prerelease === null) {
    return true;
  }
  if (currentVersion.prerelease === null) {
    return false;
  }

  return remoteVersion.prerelease > currentVersion.prerelease;
}

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  digest?: string | null;
}

export interface MacUpdateAsset {
  name: string;
  url: string;
  digest: string | null;
}

// electron-builder's mac artifactName is pinned to `${productName}-${version}-${arch}.${ext}`
// (package.json), so every dmg unambiguously carries its arch - no defaultArch guessing.
export function pickMacAsset(assets: GitHubReleaseAsset[], arch: string): MacUpdateAsset | null {
  const match = assets.find(
    (asset) => asset.name.endsWith('.dmg') && asset.name.includes(`-${arch}.`)
  );

  return match
    ? { name: match.name, url: match.browser_download_url, digest: match.digest ?? null }
    : null;
}
