import { EnvUtil } from './utils/env.js';

export const BACKEND_BASE_URL = EnvUtil.isDev()
  ? 'http://localhost:8080'
  : 'https://api.powerinterviewai.com';

// Minimum allowed dimensions for window bounds. The renderer degrades gracefully below its
// preferred layout - computeAvailable() in pages/main/index.tsx shrinks the transcript dock and
// suggestion panels down to their own floors (TRANSCRIPT_DOCK_MIN_HEIGHT / SUGGESTION_MIN_HEIGHT,
// both in renderer/lib/consts) instead of clipping, so this only has to leave room for the window
// chrome plus those floors, not the full preferred layout.
export const MIN_WIDTH = 840;
export const MIN_HEIGHT = 600;

// Bounds a first launch starts with, before the user resizes and we persist their choice.
export const DEFAULT_WIDTH = 1024;
export const DEFAULT_HEIGHT = 768;

// Transcript constants
export const TRANSCRIPT_INTER_TRANSCRIPT_GAP_MS = 5000;

// An in-flight mic partial gates live suggestions, and it is only cleared by a matching final.
// An ASR websocket that drops mid-utterance never sends that final, so the partial is orphaned
// and suppresses suggestions until the candidate next finishes speaking - which can span
// several interviewer questions if they stay quiet. Generous on purpose: the gate exists to
// stop suggestions firing over someone mid-answer, so a short value would regress that.
export const SELF_PARTIAL_STALE_MS = 15_000;

// Most recent transcript entries sent with a suggestion request. The backend already slices to
// its own MAX_TRANSCRIPTS_NUM before building the prompt, so everything beyond this was upload
// cost for no effect - and it grew for the whole interview.
//
// Deliberately larger than the backend's window, so a change there does not silently starve the
// prompt. This does NOT bound retained history: the end-of-interview summary and the .docx/.md
// export read the full transcript from app state.
export const TRANSCRIPT_UPLOAD_LIMIT = 60;

// Suggestion constants
export const LIVE_SUGGESTION_GAP_MS = 2000;
export const LIVE_SUGGESTION_NO_SUGGESTION = 'NO_SUGGESTION_NEEDED';
export const ACTION_SUGGESTION_MAX_CAPTURES = 4;
export const ACTION_TIMEOUT_MS = 30_000; // 30 seconds

// Longest edge a screenshot is captured at. Capturing at full physical resolution meant
// NativeImage.toPNG() - which is synchronous, on the main process - ran on a 4K bitmap and
// stalled the event loop for hundreds of milliseconds per capture, blocking IPC, transcript
// ingest and any in-flight suggestion stream. It also drove the request payload, which the
// backend then base64-inflates by a third.
//
// Not lower than this: the model has to read code and stack traces off these screenshots, and
// the failure mode of over-shrinking is silent - a confident answer about a blurry image.
export const CAPTURE_MAX_EDGE_PX = 1920;

// Time to first byte. Separate budgets: an action request uploads up to four screenshots and
// the backend base64-encodes them before the provider emits a token, so it starts far slower
// than a live suggestion. These bound a request that never starts, not total generation time.
export const LIVE_SUGGESTION_TTFB_MS = 20_000;
export const ACTION_SUGGESTION_TTFB_MS = 45_000;

// Gap between chunks once a stream is flowing. Reset on every chunk, so this never caps a
// long-but-healthy generation.
export const SUGGESTION_STALL_MS = 15_000;

// Backstop only. The action lock is released explicitly on every path; this exists so that a
// bug in a future caller cannot brick Ctrl+Shift+F9/F11/F12 for the rest of a session. Well
// above the longest legitimate action suggestion.
export const ACTION_LOCK_MAX_HOLD_MS = 180_000;

// Stealth mode opacity levels (cycles on each toggle; default = second highest)
export const OPACITY_LEVELS = [0.2, 0.5, 0.73, 0.9] as const;
export const OPACITY_DEFAULT = OPACITY_LEVELS[OPACITY_LEVELS.length - 2]; // 0.73

// Zoom feature constants
export const ZOOM_STEP = 0.1; // factor increment/decrement
export const ZOOM_MIN_FACTOR = 0.5;
export const ZOOM_MAX_FACTOR = 3.0;
