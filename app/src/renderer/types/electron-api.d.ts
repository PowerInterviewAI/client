import type { Config } from './config';
import type { AppState } from './app-state';

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

    // App state management
    appState: {
      get: () => Promise<AppState>;
      update: (updates: Partial<AppState>) => Promise<AppState>;
      addReplySuggestion: (suggestion: ReplySuggestion) => Promise<AppState>;
      addCodeSuggestion: (suggestion: CodeSuggestion) => Promise<AppState>;
      clearTranscripts: () => Promise<AppState>;
      clearSuggestions: () => Promise<AppState>;
    };

    // Pushed app-state updates from main process
    onAppStateUpdated: (callback: (state: AppState) => void) => () => void;

    // Transcription management
    transcription: {
      start: () => Promise<void>;
      stop: () => Promise<void>;
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

    // VCam bridge management
    vcam: {
      startBridge: () => Promise<void>;
      stopBridge: () => Promise<void>;
    };

    // Window controls
    minimize: () => void;
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
