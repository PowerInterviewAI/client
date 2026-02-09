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
  runningState: RunningState;
  transcripts: Transcript[];
  replySuggestions: ReplySuggestion[];
  codeSuggestions: CodeSuggestion[];
  isBackendLive: boolean;
  isGpuServerLive: boolean;
}
