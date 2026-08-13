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
import { SuggestionMode } from '../types/llm.js';
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

// Every broadcast structured-clones the whole renderer state, and they fire on each streamed
// token and each ASR partial - roughly 20/second across two channels, against a transcript array
// that grows for the whole interview. Coalescing bounds that cost per unit time instead of per
// event. Short enough that streaming still reads as streaming.
const BROADCAST_COALESCE_MS = 50;

export class AppStateService {
  private state: AppState;
  private broadcastTimer: ReturnType<typeof setTimeout> | null = null;

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
          mode: SuggestionMode.Normal,
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
    // Clear reaches main and resets the state here, but the renderer only ever learns about
    // state through this broadcast - it does not poll while the push API exists. Without this
    // the panels keep rendering pre-Clear content until some unrelated change broadcasts.
    this.notifyRenderer();
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
    if (this.broadcastTimer) return;

    this.broadcastTimer = setTimeout(() => {
      this.broadcastTimer = null;
      this.sendToRenderer();
    }, BROADCAST_COALESCE_MS);
  }

  /**
   * Send a pending broadcast immediately, if one is scheduled.
   *
   * Coalescing means a caller that needs the renderer to have the current state right now - a
   * test, or a shutdown path - cannot simply wait. Deliberately a no-op when nothing is
   * pending, so flushing cannot manufacture a broadcast that the change detection suppressed.
   */
  flushRenderer(): void {
    if (!this.broadcastTimer) return;

    clearTimeout(this.broadcastTimer);
    this.broadcastTimer = null;
    this.sendToRenderer();
  }

  /**
   * The actual send. Separate from flushRenderer because the two callers disagree about the
   * pending check: flushRenderer needs it, the timer callback must not have it. Folding the
   * send into flushRenderer meant the timer cleared its own handle and then called a method
   * guarded on that handle, so the coalesced path - the only one production uses - silently
   * sent nothing at all.
   */
  private sendToRenderer(): void {
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
