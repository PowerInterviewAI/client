// Pure helpers for the macOS manual-download update flow (see auto-updater.service.ts).
// No Electron imports here on purpose - keeps this directly unit-testable.

export function isNewerVersion(remote: string, current: string): boolean {
  const remoteParts = remote.split('.').map(Number);
  const currentParts = current.split('.').map(Number);
  const length = Math.max(remoteParts.length, currentParts.length);

  for (let i = 0; i < length; i++) {
    const remotePart = remoteParts[i] ?? 0;
    const currentPart = currentParts[i] ?? 0;
    if (remotePart !== currentPart) {
      return remotePart > currentPart;
    }
  }

  return false;
}

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface MacUpdateAsset {
  name: string;
  url: string;
}

// electron-builder's mac artifactName is pinned to `${productName}-${version}-${arch}.${ext}`
// (package.json), so every dmg unambiguously carries its arch - no defaultArch guessing.
export function pickMacAsset(assets: GitHubReleaseAsset[], arch: string): MacUpdateAsset | null {
  const match = assets.find(
    (asset) => asset.name.endsWith('.dmg') && asset.name.includes(`-${arch}.`)
  );

  return match ? { name: match.name, url: match.browser_download_url } : null;
}
