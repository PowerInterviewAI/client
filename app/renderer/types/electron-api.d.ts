import type { Config } from './config';

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
      onTranscriptUpdate: (callback: (transcript: {
        text: string;
        isFinal: boolean;
        speaker: 'user' | 'interviewer';
        timestamp: Date;
      }) => void) => () => void;
      onTranscriptionError: (callback: (error: {
        speaker: 'user' | 'interviewer';
        error: string;
      }) => void) => () => void;
    };

    // VCam bridge management
    vcam: {
      startBridge: () => Promise<void>;
      stopBridge: () => Promise<void>;
      getStatus: () => Promise<{ bridgeActive: boolean }>;
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
