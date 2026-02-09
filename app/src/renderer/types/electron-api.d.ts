import type { AppState } from './app-state';
import type { Config } from './config';
import type { PushNotification } from './push-notification';

export {};

declare global {
  interface ElectronAPI {
    // Hotkey scroll events
    onHotkeyScroll: (callback: (section: string, direction: 'up' | 'down') => void) => () => void;

    // Configuration management
    config: {
      get: () => Promise<Config>;
      update: (updates: Partial<Config>) => Promise<Config>;
    };

    // Authentication management
    auth: {
      signup: (
        username: string,
        email: string,
        password: string
      ) => Promise<{ success: boolean; error?: string }>;
      login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
      logout: () => Promise<{ success: boolean; error?: string }>;
      changePassword: (
        oldPassword: string,
        newPassword: string
      ) => Promise<{ success: boolean; error?: string }>;
    };

    // App state management
    appState: {
      get: () => Promise<AppState>;
      update: (updates: Partial<AppState>) => Promise<AppState>;
    };

    // Pushed app-state updates from main process
    onAppStateUpdated: (callback: (state: AppState) => void) => () => void;

    // Transcription management
    transcription: {
      clear: () => Promise<void>;
      start: () => Promise<void>;
      stop: () => Promise<void>;
    };

    // Reply suggestion management
    replySuggestion: {
      clear: () => Promise<void>;
      stop: () => Promise<void>;
    };

    // Code suggestion management
    codeSuggestion: {
      clear: () => Promise<void>;
      stop: () => Promise<void>;
    };

    // WebRTC management
    webRtc: {
      // eslint-disable-next-line
      offer: (any) => Promise<any>;
      startAgents: () => Promise<void>;
      stopAgents: () => Promise<void>;
      putVideoFrame: (frameData: ArrayBuffer) => Promise<void>;
    };

    // Push notification listener
    onPushNotification: (callback: (notification: PushNotification) => void) => () => void;

    // Tools management
    tools: {
      exportTranscript: () => Promise<string>;
      clearAll: () => Promise<void>;
    };

    // Auto-updater management
    autoUpdater: {
      checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
      quitAndInstall: () => Promise<{ success: boolean; error?: string }>;
      getVersion: () => Promise<{ success: boolean; version?: string; error?: string }>;
      onStatusUpdate: (
        callback: (data: {
          status:
            | 'checking'
            | 'available'
            | 'not-available'
            | 'downloading'
            | 'downloaded'
            | 'error';
          info: { version: string; releaseDate: string; releaseNotes?: string } | null;
          progress?: {
            bytesPerSecond: number;
            percent: number;
            transferred: number;
            total: number;
          } | null;
          error?: string;
        }) => void
      ) => () => void;
    };

    // Window controls
    close: () => void;

    // Edge resize support
    resizeWindowDelta: (dx: number, dy: number, edge: string) => void;

    // Stealth control helpers
    setStealth: (isStealth: boolean) => void;
    toggleStealth: () => void;

    // Opacity toggle helper
    toggleOpacity: () => void;
  }

  interface Window {
    electronAPI?: ElectronAPI;
  }
}
