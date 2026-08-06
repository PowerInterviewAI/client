import { EnvUtil } from './utils/env.js';

export const BACKEND_BASE_URL = EnvUtil.isDev()
  ? 'http://localhost:8080'
  : 'https://api.powerinterviewai.com';

// Minimum allowed dimensions for window bounds. 540 was sized when transcription was a fixed
// 320px left column and cost width, not height. It now docks at the bottom and takes a band out
// of the same vertical budget as the suggestion panels, so the minimum grows by the dock's own
// floor plus the gap above it (TRANSCRIPT_DOCK_MIN_HEIGHT 120 + 4, both in renderer/lib/consts).
export const MIN_WIDTH = 900;
export const MIN_HEIGHT = 664;

// Bounds a first launch starts with, before the user resizes and we persist their choice.
export const DEFAULT_WIDTH = 1024;
export const DEFAULT_HEIGHT = 768;

// Transcript constants
export const TRANSCRIPT_INTER_TRANSCRIPT_GAP_MS = 5000;

// Suggestion constants
export const LIVE_SUGGESTION_GAP_MS = 2000;
export const LIVE_SUGGESTION_NO_SUGGESTION = 'NO_SUGGESTION_NEEDED';
export const ACTION_SUGGESTION_MAX_CAPTURES = 4;
export const ACTION_TIMEOUT_MS = 30_000; // 30 seconds

// Stealth mode opacity levels (cycles on each toggle; default = second highest)
export const OPACITY_LEVELS = [0.2, 0.5, 0.73, 0.9] as const;
export const OPACITY_DEFAULT = OPACITY_LEVELS[OPACITY_LEVELS.length - 2]; // 0.73

// Zoom feature constants
export const ZOOM_STEP = 0.1; // factor increment/decrement
export const ZOOM_MIN_FACTOR = 0.5;
export const ZOOM_MAX_FACTOR = 3.0;
