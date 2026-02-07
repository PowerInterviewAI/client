/**
 * Application State Types
 */

export enum Speaker {
  SELF = 'self',
  OTHER = 'other',
}

export enum SuggestionState {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  PENDING = 'pending',
  LOADING = 'loading',
  SUCCESS = 'success',
  STOPPED = 'stopped',
  ERROR = 'error',
}

export enum RunningState {
  IDLE = 'idle',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
}

export interface Transcript {
  timestamp: number;
  text: string;
  speaker: Speaker;
  isFinal: boolean;
  endTimestamp: number;
}

export interface ReplySuggestion {
  timestamp: number;
  last_question: string;
  answer: string;
  state: SuggestionState;
}

export interface CodeSuggestion {
  timestamp: number;
  image_urls: (string | null)[];
  suggestion_content: string;
  state: SuggestionState;
}

export interface AppState {
  isRunning: boolean;
  isStealth: boolean;
  isRecording: boolean;
  isBackendLive: boolean;
  isGpuServerLive: boolean;
  isLoggedIn: boolean | null;
  runningState: RunningState;
  transcripts: Transcript[];
  replySuggestions: ReplySuggestion[];
  codeSuggestions: CodeSuggestion[];
}
