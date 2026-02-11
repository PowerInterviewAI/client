import { type CodeSuggestion, type ReplySuggestion } from './suggestion';
import { type Transcript } from './transcript';

export enum RunningState {
  Idle = 'idle',
  Starting = 'starting',
  Running = 'running',
  Stopping = 'stopping',
}

export interface AppState {
  isLoggedIn: boolean | null;
  isBackendLive: boolean;
  isGpuServerLive: boolean;
  runningState: RunningState;
  transcripts: Transcript[];
  replySuggestions: ReplySuggestion[];
  codeSuggestions: CodeSuggestion[];
  credits?: number;
}
