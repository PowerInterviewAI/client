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
  is_logged_in: boolean | null;
  assistant_state: RunningState;
  transcripts: Transcript[];
  suggestions: Suggestion[];
  is_backend_live: boolean;
  is_gpu_server_live: boolean;
}
