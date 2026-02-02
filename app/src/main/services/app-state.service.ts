/**
 * App State Service
 * Central manager for application runtime state shared across main process
 */

import { AppState, Transcript, ReplySuggestion, CodeSuggestion } from '../types/app-state.js';

const DEFAULT_STATE: AppState = {
  isRunning: false,
  isStealth: false,
  isRecording: false,
  devices: [],
  isBackendLive: false,
  isGpuServerLive: false,
  isLoggedIn: false,
  assistantState: 'idle',
  transcripts: [],
  replySuggestions: [],
  codeSuggestions: [],
};

export class AppStateService {
  private state: AppState;

  constructor() {
    this.state = { ...DEFAULT_STATE };
  }

  getState(): AppState {
    return { ...this.state };
  }

  updateState(updates: Partial<AppState>): AppState {
    this.state = { ...this.state, ...updates };
    return this.getState();
  }

  addTranscript(t: {
    text: string;
    isFinal: boolean;
    speaker: 'user' | 'interviewer';
    timestamp: Date;
  }): void {
    if (!t.isFinal) return;
    const entry: Transcript = {
      text: t.text,
      speaker: t.speaker === 'user' ? 'self' : 'other',
      timestamp: t.timestamp.getTime(),
    } as unknown as Transcript;
    this.state = { ...this.state, transcripts: [...this.state.transcripts, entry] };
  }

  addReplySuggestion(s: ReplySuggestion): void {
    this.state = { ...this.state, replySuggestions: [...this.state.replySuggestions, s] };
  }

  addCodeSuggestion(s: CodeSuggestion): void {
    this.state = { ...this.state, codeSuggestions: [...this.state.codeSuggestions, s] };
  }

  clearTranscripts(): void {
    this.state = { ...this.state, transcripts: [] };
  }

  clearSuggestions(): void {
    this.state = { ...this.state, replySuggestions: [], codeSuggestions: [] };
  }
}

export const appStateService = new AppStateService();
