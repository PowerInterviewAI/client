import { Suggestion } from './suggestion';
import { Transcript } from './transcript';

export enum RunningState {
  IDLE = 'idle',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
}

export interface AppState {
  transcripts: Transcript[];
  running_state: RunningState;
  suggestions: Suggestion[];
}
