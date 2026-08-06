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
