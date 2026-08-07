import { type ActionSuggestion, type LiveSuggestion } from './suggestion';
import { type Transcript } from './transcript';

export enum RunningState {
  Idle = 'idle',
  Starting = 'starting',
  Running = 'running',
  Stopping = 'stopping',
}

export enum UserRole {
  User = 'user',
  TrialUser = 'trial_user',
  Admin = 'admin',
}

/** Full config, fetched on demand via `account.get()` - not carried in the app state. */
export interface InterviewConfig {
  fullName: string;
  profileData: string;
  context: string;
}

/**
 * What the app state carries about the interview config. The profile and context can run to
 * hundreds of KB, so main sends only what the UI renders and the dialog fetches the rest.
 */
export interface InterviewConfigSummary {
  fullName: string;
  hasProfileData: boolean;
}

export interface AppState {
  isLoggedIn: boolean | null;
  isBackendLive: boolean | null;
  runningState: RunningState;
  transcripts: Transcript[];
  liveSuggestions: LiveSuggestion[];
  actionSuggestions: ActionSuggestion[];
  credits?: number;
  userRole?: UserRole;
  providedLLMModel?: string;
  interviewConfig: InterviewConfigSummary;
  interviewConfigLoaded: boolean;
}
