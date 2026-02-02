/**
 * App State Service
 * Central manager for application runtime state shared across main process
 */

import { AppState, Transcript, ReplySuggestion, CodeSuggestion } from '../types/app-state.js';
import { getWindowReference } from './window-control-service.js';

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
    const s = this.getState();
    // broadcast update to renderer if window available
    try {
      const win = getWindowReference();
      if (win && !win.isDestroyed()) {
        win.webContents.send('app-state-updated', s);
      }
    } catch (e) {
      console.warn('Failed to broadcast app state update:', e);
    }
    return s;
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
    // broadcast update
    try {
      const win = getWindowReference();
      if (win && !win.isDestroyed()) {
        win.webContents.send('app-state-updated', this.getState());
      }
    } catch (e) {
      console.warn('Failed to broadcast app state transcript:', e);
    }
  }

  addReplySuggestion(s: ReplySuggestion): void {
    this.state = { ...this.state, replySuggestions: [...this.state.replySuggestions, s] };
    try {
      const win = getWindowReference();
      if (win && !win.isDestroyed()) {
        win.webContents.send('app-state-updated', this.getState());
      }
    } catch (e) {
      console.warn('Failed to broadcast reply suggestion:', e);
    }
  }

  addCodeSuggestion(s: CodeSuggestion): void {
    this.state = { ...this.state, codeSuggestions: [...this.state.codeSuggestions, s] };
    try {
      const win = getWindowReference();
      if (win && !win.isDestroyed()) {
        win.webContents.send('app-state-updated', this.getState());
      }
    } catch (e) {
      console.warn('Failed to broadcast code suggestion:', e);
    }
  }

  clearTranscripts(): void {
    this.state = { ...this.state, transcripts: [] };
    try {
      const win = getWindowReference();
      if (win && !win.isDestroyed()) {
        win.webContents.send('app-state-updated', this.getState());
      }
    } catch (e) {
      console.warn('Failed to broadcast clear transcripts:', e);
    }
  }

  clearSuggestions(): void {
    this.state = { ...this.state, replySuggestions: [], codeSuggestions: [] };
    try {
      const win = getWindowReference();
      if (win && !win.isDestroyed()) {
        win.webContents.send('app-state-updated', this.getState());
      }
    } catch (e) {
      console.warn('Failed to broadcast clear suggestions:', e);
    }
  }
}

export const appStateService = new AppStateService();
