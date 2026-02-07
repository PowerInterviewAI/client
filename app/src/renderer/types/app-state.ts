import { type CodeSuggestion, type ReplySuggestion } from './suggestion';
import { type Transcript } from './transcript';

export enum RunningState {
  IDLE = 'idle',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
}

export interface AppState {
  isLoggedIn: boolean | null;
  runningState: RunningState;
  transcripts: Transcript[];
  replySuggestions: ReplySuggestion[];
  codeSuggestions: CodeSuggestion[];
  isBackendLive: boolean;
  isGpuServerLive: boolean;
}
