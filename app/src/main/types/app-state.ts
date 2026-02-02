/**
 * Application State Types
 */

export enum Speaker {
  SELF = 'self',
  OTHER = 'other',
}

export enum SuggestionState {
  IDLE = 'idle',
  PENDING = 'pending',
  LOADING = 'loading',
  SUCCESS = 'success',
  STOPPED = 'stopped',
  ERROR = 'error',
}

export interface Transcript {
  timestamp: number;
  text: string;
  speaker: Speaker;
}

export interface ReplySuggestion {
  timestamp: number;
  last_question: string;
  answer: string;
  state: SuggestionState;
}

export interface CodeSuggestion {
  timestamp: number;
  image_urls: string[];
  suggestion_content: string;
  state: SuggestionState;
}

export interface AppState {
  isRunning: boolean;
  isStealth: boolean;
  isRecording: boolean;
  currentSession?: Session;
  devices: DeviceInfo[];
  isBackendLive: boolean;
  isGpuServerLive: boolean;
  isLoggedIn: boolean;
  assistantState: 'idle' | 'starting' | 'running' | 'stopping';
  transcripts: Transcript[];
  replySuggestions: ReplySuggestion[];
  codeSuggestions: CodeSuggestion[];
}

export interface Session {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  transcript: TranscriptEntry[];
  suggestions: Suggestion[];
}

export interface TranscriptEntry {
  id: string;
  timestamp: Date;
  text: string;
  speaker: 'user' | 'interviewer' | 'system';
  confidence?: number;
}

export interface Suggestion {
  id: string;
  type: 'code' | 'reply' | 'general';
  content: string;
  confidence: number;
  timestamp: Date;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'audio-input' | 'audio-output' | 'video-input';
  isDefault: boolean;
}
