import { createWriteStream } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

import pkg from 'electron-updater';
const { autoUpdater } = pkg;

import { app, BrowserWindow, shell } from 'electron';

import { GITHUB_RELEASES_OWNER, GITHUB_RELEASES_REPO } from '../consts.js';
import { EnvUtil } from '../utils/env.js';
import { isNewerVersion, pickMacAsset } from '../utils/mac-update.util.js';

interface GitHubRelease {
  tag_name: string;
  published_at: string;
  body: string | null;
  assets: { name: string; browser_download_url: string }[];
}

const MAC_UPDATE_PROGRESS_THROTTLE_MS = 200;

export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes?: string;
}

export enum UpdateStatus {
  Checking = 'checking',
  Available = 'available',
  NotAvailable = 'not-available',
  Downloading = 'downloading',
  Downloaded = 'downloaded',
  Error = 'error',
}

export interface UpdateProgressInfo {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null;
  private updateCheckInProgress = false;
  private updateDownloaded = false;
  private macDownloadedFilePath: string | null = null;

  constructor() {
    this.setupAutoUpdater();
  }

  private setupAutoUpdater(): void {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.logger = {
      info: (...args) => console.log('[AutoUpdater]', ...args),
      warn: (...args) => console.warn('[AutoUpdater]', ...args),
      error: (...args) => console.error('[AutoUpdater]', ...args),
      debug: (...args) => console.debug('[AutoUpdater]', ...args),
    };

    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for updates...');
      this.notifyRenderer(UpdateStatus.Checking, null);
    });

    autoUpdater.on('update-available', (info) => {
      console.log('[AutoUpdater] Update available:', info.version);
      this.notifyRenderer(UpdateStatus.Available, {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes as string | undefined,
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('[AutoUpdater] No updates available. Current version:', info.version);
      this.updateCheckInProgress = false;
      this.notifyRenderer(UpdateStatus.NotAvailable, null);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      console.log(
        `[AutoUpdater] Download progress: ${progressObj.percent.toFixed(2)}% (${(progressObj.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s)`
      );
      this.notifyRenderer(UpdateStatus.Downloading, null, {
        bytesPerSecond: progressObj.bytesPerSecond,
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[AutoUpdater] Update downloaded:', info.version);
      this.updateCheckInProgress = false;
      this.updateDownloaded = true;
      this.notifyRenderer(UpdateStatus.Downloaded, {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes as string | undefined,
      });
    });

    autoUpdater.on('error', (error) => {
      console.error('[AutoUpdater] Error:', error);
      this.updateCheckInProgress = false;
      this.notifyRenderer(UpdateStatus.Error, null, null, error.message || 'Unknown error');
    });
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  async checkForUpdates(): Promise<void> {
    if (this.updateCheckInProgress || this.updateDownloaded) {
      return;
    }

    if (process.platform === 'darwin') {
      return this.checkForUpdatesMac();
    }

    if (EnvUtil.isDev()) {
      autoUpdater.forceDevUpdateConfig = true;
    }

    this.updateCheckInProgress = true;

    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.error('[AutoUpdater] Failed to check for updates:', error);
      this.updateCheckInProgress = false;
    }
  }

  // Squirrel.Mac (electron-updater's mac install mechanism) requires the app to be signed with
  // a real Developer ID certificate. This build only ad-hoc signs (see package.json mac.identity),
  // so silent apply is not viable on macOS - this checks GitHub releases directly instead and
  // leaves installing to the user via a downloaded .dmg (see quitAndInstall).
  private async checkForUpdatesMac(): Promise<void> {
    this.updateCheckInProgress = true;
    this.notifyRenderer(UpdateStatus.Checking, null);

    try {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_RELEASES_OWNER}/${GITHUB_RELEASES_REPO}/releases/latest`,
        { headers: { Accept: 'application/vnd.github+json' } }
      );

      if (!response.ok) {
        throw new Error(`GitHub releases request failed: ${response.status}`);
      }

      const release = (await response.json()) as GitHubRelease;
      const latestVersion = release.tag_name.replace(/^v/, '');

      if (!isNewerVersion(latestVersion, app.getVersion())) {
        this.updateCheckInProgress = false;
        this.notifyRenderer(UpdateStatus.NotAvailable, null);
        return;
      }

      const info: UpdateInfo = {
        version: latestVersion,
        releaseDate: release.published_at,
        releaseNotes: release.body ?? undefined,
      };
      this.notifyRenderer(UpdateStatus.Available, info);

      const asset = pickMacAsset(release.assets, process.arch);
      if (!asset) {
        throw new Error("No macOS installer found for this Mac's architecture");
      }

      await this.downloadMacAsset(asset, info);
    } catch (error) {
      console.error('[AutoUpdater] Failed to check for updates (mac):', error);
      this.updateCheckInProgress = false;
      this.notifyRenderer(
        UpdateStatus.Error,
        null,
        null,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  private async downloadMacAsset(
    asset: { name: string; url: string },
    info: UpdateInfo
  ): Promise<void> {
    const destDir = path.join(app.getPath('temp'), 'power-interview-ai-updates');
    const destPath = path.join(destDir, asset.name);

    await mkdir(destDir, { recursive: true });

    const response = await fetch(asset.url);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download update: ${response.status}`);
    }

    const total = Number(response.headers.get('content-length')) || 0;
    let transferred = 0;
    let lastEmit = 0;
    const startTime = Date.now();

    try {
      const source = Readable.fromWeb(response.body as unknown as NodeReadableStream<Uint8Array>);
      source.on('data', (chunk: Buffer) => {
        transferred += chunk.length;
        const now = Date.now();
        if (now - lastEmit < MAC_UPDATE_PROGRESS_THROTTLE_MS && transferred !== total) {
          return;
        }
        lastEmit = now;
        const elapsedSeconds = (now - startTime) / 1000;
        this.notifyRenderer(UpdateStatus.Downloading, null, {
          bytesPerSecond: elapsedSeconds > 0 ? transferred / elapsedSeconds : 0,
          percent: total > 0 ? (transferred / total) * 100 : 0,
          transferred,
          total,
        });
      });

      await pipeline(source, createWriteStream(destPath));
    } catch (error) {
      await rm(destPath, { force: true });
      throw error;
    }

    this.macDownloadedFilePath = destPath;
    this.updateDownloaded = true;
    this.updateCheckInProgress = false;
    this.notifyRenderer(UpdateStatus.Downloaded, info);
  }

  async quitAndInstall(): Promise<void> {
    if (process.platform === 'darwin') {
      if (!this.macDownloadedFilePath) {
        return;
      }
      await shell.openPath(this.macDownloadedFilePath);
      app.quit();
      return;
    }

    autoUpdater.quitAndInstall(false, true);
  }

  getCurrentVersion(): string {
    return autoUpdater.currentVersion.version;
  }

  private notifyRenderer(
    status: UpdateStatus,
    info: UpdateInfo | null,
    progress?: UpdateProgressInfo | null,
    error?: string
  ): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return;
    }

    this.mainWindow.webContents.send('auto-updater:status', {
      status,
      info,
      progress,
      error,
    });
  }
}

export const autoUpdaterService = new AutoUpdaterService();
