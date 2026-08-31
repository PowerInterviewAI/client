export const APP_NAME = 'Power Interview AI';

export const isMac = navigator.platform.toUpperCase().includes('MAC');

export const CREDITS_PER_MINUTE = 10;

// maximum allowable RTT change (ms) before restarting audio agent
export const MAX_RTT_DIFF = 50;
export const MAX_AUDIO_DELAY_MS = 500;

// Transcription bottom dock sizing. The ratio only applies while suggestion panels share the
// main area - docked alone, transcription fills it.
export const TRANSCRIPT_DOCK_RATIO = 0.3;
export const TRANSCRIPT_DOCK_MIN_HEIGHT = 120;
export const TRANSCRIPT_DOCK_MAX_HEIGHT = 280;
// Height the suggestion column keeps for itself, whatever the dock would like to take.
export const SUGGESTION_MIN_HEIGHT = 100;
// The drag handle between them. Both panels are explicitly sized, so this has to come out of the
// budget or the pair overflows the container by exactly the handle.
export const DOCK_HANDLE_HEIGHT = 6;

// Mock interview: how long the microphone stays gated after the interviewer's audio finishes, to
// cover room reverb and Deepgram's own lookahead. Mirrors the main-process constant of the same
// name in src/main/consts.ts - kept separate because renderer and main code are compiled and
// bundled independently and cannot import across that boundary.
export const MOCK_TTS_TAIL_MS = 600;

// Backstop only, the same role ACTION_LOCK_MAX_HOLD_MS plays for the action-suggestion lock - see
// MicGate in mock-tts.service.ts for why a `finally` alone is not enough.
export const MOCK_TTS_GATE_MAX_HOLD_MS = 120_000;
