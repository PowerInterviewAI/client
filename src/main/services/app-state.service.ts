/**
 * App State Service
 * Central manager for application runtime state shared across main process
 */

import {
  ActionSuggestion,
  AppState,
  LiveSuggestion,
  RendererAppState,
  RunningState,
  Speaker,
  SuggestionState,
} from '../types/app-state.js';
import { getWindowReference } from './window-control.service.js';

const DEFAULT_STATE: AppState = {
  isStealth: false,
  isBackendLive: null,
  isLoggedIn: false,
  runningState: RunningState.Idle,
  transcripts: [],
  liveSuggestions: [],
  actionSuggestions: [],
  credits: undefined,
  userRole: undefined,
  providedLLMModel: undefined,
  interviewConfig: { fullName: '', profileData: '', context: '' },
  interviewConfigLoaded: false,
};

export class AppStateService {
  private state: AppState;

  constructor() {
    this.state = { ...DEFAULT_STATE };
    this.setPlaceholderState();
  }

  setPlaceholderState() {
    const tstampNow = Date.now();
    this.state = {
      ...this.state,
      // Set placeholder data to make it easier to visualize the UI during development
      transcripts: [
        {
          timestamp: tstampNow,
          text: 'Transcripts will be here',
          speaker: Speaker.Other,
          isFinal: false,
          endTimestamp: tstampNow + 5000,
        },
      ],
      liveSuggestions: [
        {
          timestamp: tstampNow,
          last_question: 'Interviewer questions will be here',
          answer: 'Suggested answers will be here in real-time',
          state: SuggestionState.Success,
          error: '',
        },
      ],
      actionSuggestions: [
        {
          timestamp: tstampNow,
          last_question: 'Interviewer questions will be here',
          answer:
            'Triggered suggestions will be here. For example, reply suggestion, coding test solution, diagram descriptions, etc.',
          image_urls: [null, null, null, null],
          state: SuggestionState.Success,
          error: '',
        },
      ],
    };
  }

  getState(): AppState {
    return { ...this.state };
  }

  /**
   * The state as the renderer sees it. Keeps the CV and job description out of IPC: they can
   * run to hundreds of KB and every state change broadcasts the whole object.
   */
  getRendererState(): RendererAppState {
    const { interviewConfig, ...rest } = this.state;
    return {
      ...rest,
      interviewConfig: {
        fullName: interviewConfig.fullName,
        // Length first: this runs on every broadcast, and trimming a 128,000-character CV to
        // learn it is non-empty copies the whole string. The empty case is the only one that
        // needs the trim at all, to keep whitespace from reading as a set profile.
        hasProfileData:
          interviewConfig.profileData.length > 0 && interviewConfig.profileData.trim() !== '',
      },
    };
  }

  updateState(updates: Partial<AppState>): AppState {
    // The health-check loops re-report identical values every 1-5s. Broadcasting those would
    // re-render every subscriber for nothing, so only notify when something actually moved.
    const changed = (Object.keys(updates) as (keyof AppState)[]).some(
      (key) => !Object.is(this.state[key], updates[key])
    );

    this.state = { ...this.state, ...updates };
    if (changed) {
      this.notifyRenderer();
    }
    return this.getState();
  }

  private notifyRenderer(): void {
    try {
      const win = getWindowReference();
      if (win && !win.isDestroyed()) {
        win.webContents.send('app:state-updated', this.getRendererState());
      }
    } catch (e) {
      console.warn('Failed to broadcast app state update:', e);
    }
  }

  addLiveSuggestion(s: LiveSuggestion): void {
    this.state = { ...this.state, liveSuggestions: [...this.state.liveSuggestions, s] };
    this.notifyRenderer();
  }

  addActionSuggestion(s: ActionSuggestion): void {
    this.state = { ...this.state, actionSuggestions: [...this.state.actionSuggestions, s] };
    this.notifyRenderer();
  }
}

export const appStateService = new AppStateService();
