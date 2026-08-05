/**
 * Application State Types
 */

import { UserRole } from './health-check.js';

export enum Speaker {
  Self = 'self',
  Other = 'other',
}

export enum SuggestionState {
  Idle = 'idle',
  Uploading = 'uploading',
  Pending = 'pending',
  Loading = 'loading',
  Success = 'success',
  Stopped = 'stopped',
  Error = 'error',
}

export enum RunningState {
  Idle = 'idle',
  Starting = 'starting',
  Running = 'running',
  Stopping = 'stopping',
}

export interface Transcript {
  timestamp: number;
  text: string;
  speaker: Speaker;
  isFinal: boolean;
  endTimestamp: number;
}

export interface LiveSuggestion {
  timestamp: number;
  last_question: string;
  answer: string;
  state: SuggestionState;
  error: string;
}

export interface ActionSuggestion {
  timestamp: number;
  last_question: string;
  answer: string;
  image_urls: (string | null)[];
  state: SuggestionState;
  error: string;
}

export interface InterviewConfig {
  fullName: string;
  profileData: string;
  context: string;
}

/**
 * What the renderer is told about the interview config.
 *
 * The profile and context hold a full CV and job description (up to 128k chars each) and the
 * whole app state is broadcast on every change, so the bulk stays in the main process. The
 * configuration dialog fetches the full values on demand over `account:get`.
 */
export interface InterviewConfigSummary {
  fullName: string;
  hasProfileData: boolean;
}

export interface AppState {
  isStealth: boolean;
  isBackendLive: boolean | null;
  isLoggedIn: boolean | null;
  runningState: RunningState;
  transcripts: Transcript[];
  liveSuggestions: LiveSuggestion[];
  actionSuggestions: ActionSuggestion[];
  credits?: number;
  userRole?: UserRole;
  providedLLMModel?: string;
  interviewConfig: InterviewConfig;
  /** False until the account's config has been read this session; editing is unsafe before then. */
  interviewConfigLoaded: boolean;
}

/** The app state as sent to the renderer, with the interview config reduced to a summary. */
export type RendererAppState = Omit<AppState, 'interviewConfig'> & {
  interviewConfig: InterviewConfigSummary;
};
