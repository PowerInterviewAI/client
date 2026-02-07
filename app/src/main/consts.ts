import { EnvUtil } from './utils/env.js';

export const BACKEND_BASE_URL = EnvUtil.isDev()
  ? 'http://localhost:8000'
  : 'https://power-interview-backend.onrender.com';

export const TRANSCRIPT_SELF_ZMQ_PORT = 50002;
export const TRANSCRIPT_OTHER_ZMQ_PORT = 50003;
export const TRANSCRIPT_MAX_RESTART_COUNT = 5;
export const TRANSCRIPT_RESTART_DELAY_MS = 2000;
export const TRANSCRIPT_INTER_TRANSCRIPT_GAP_MS = 5000;

export const REPLY_SUGGESTION_NO_SUGGESTION = 'NO_SUGGESTION_NEEDED';
export const CODE_SUGGESTION_MAX_SCREENSHOTS = 3;

// VCam agent constants
export const VCAM_ZMQ_PORT = 50001;
export const VCAM_MAX_RESTART_COUNT = 5;
export const VCAM_RESTART_DELAY_MS = 2000;

// Audio control agent constants
export const AUDIO_CONTROL_MAX_RESTART_COUNT = 5;
export const AUDIO_CONTROL_RESTART_DELAY_MS = 2000;
export const AUDIO_CONTROL_DELAY_MS = 300; // Default audio delay
