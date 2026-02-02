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
      addTranscript: (transcript: {
        text: string;
        isFinal: boolean;
        speaker: 'user' | 'interviewer';
        timestamp: Date;
      }) => Promise<AppState>;
      addReplySuggestion: (suggestion: ReplySuggestion) => Promise<AppState>;
      addCodeSuggestion: (suggestion: CodeSuggestion) => Promise<AppState>;
      clearTranscripts: () => Promise<AppState>;
      clearSuggestions: () => Promise<AppState>;
    };

    // Pushed app-state updates from main process
    onAppStateUpdated: (callback: (state: AppState) => void) => () => void;

    // Transcription management
    transcription: {
      startSelf: () => Promise<void>;
      stopSelf: () => Promise<void>;
      startOther: () => Promise<void>;
      stopOther: () => Promise<void>;
      getStatus: () => Promise<{
        selfTranscriptionActive: boolean;
        otherTranscriptionActive: boolean;
      }>;
      onTranscriptUpdate: (
        callback: (transcript: {
          text: string;
          isFinal: boolean;
          speaker: 'user' | 'interviewer';
          timestamp: Date;
        }) => void
      ) => () => void;
      onTranscriptionError: (
        callback: (error: { speaker: 'user' | 'interviewer'; error: string }) => void
      ) => () => void;
    };

    // Authentication management
    auth: {
      getCredentials: () => Promise<{
        email: string;
        password: string;
        token?: string;
        lastLoginAt?: string;
      } | null>;
      saveCredentials: (
        email: string,
        password: string,
        token?: string
      ) => Promise<{ success: boolean }>;
      updateToken: (token: string) => Promise<{ success: boolean }>;
      clearCredentials: () => Promise<{ success: boolean }>;
      hasCredentials: () => Promise<boolean>;
    };

    // VCam bridge management
    vcam: {
      startBridge: () => Promise<void>;
      stopBridge: () => Promise<void>;
      getStatus: () => Promise<{ bridgeActive: boolean }>;
    };

    // App health checks
    app: {
      ping: () => Promise<{
        status: number;
        data?: { status: string; timestamp: string };
        error?: { code: string; message: string };
      }>;
      pingClient: (deviceInfo: {
        device_id: string;
        is_gpu_alive: boolean;
        is_assistant_running: boolean;
      }) => Promise<{
        status: number;
        data?: { status: string };
        error?: { code: string; message: string };
      }>;
      pingGpuServer: () => Promise<{
        status: number;
        data?: { status: string; alive: boolean };
        error?: { code: string; message: string };
      }>;
      wakeupGpuServer: () => Promise<{
        status: number;
        data?: { status: string };
        error?: { code: string; message: string };
      }>;
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
