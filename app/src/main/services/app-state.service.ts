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
    this.notifyRenderer();
    return s;
  }

  private notifyRenderer(): void {
    try {
      const win = getWindowReference();
      if (win && !win.isDestroyed()) {
        win.webContents.send('app-state-updated', this.getState());
      }
    } catch (e) {
      console.warn('Failed to broadcast app state update:', e);
    }
  }

  addTranscript(t: {
    text: string;
    isFinal: boolean;
    speaker: 'user' | 'interviewer';
    timestamp: Date;
  }): void {
    const entry: Transcript = {
      text: t.text,
      speaker: t.speaker === 'user' ? 'self' : 'other',
      timestamp: t.timestamp.getTime(),
    } as Transcript;

    // Find last transcript for speaker. If found script is not final, replace it, else append
    const transcripts = [...this.state.transcripts];
    const lastIndex = (() => {
      for (let i = transcripts.length - 1; i >= 0; i--) {
        if (transcripts[i].speaker === entry.speaker) return i;
      }
      return -1;
    })();

    if (lastIndex >= 0 && !t.isFinal) {
      // Replace last
      transcripts[lastIndex] = entry;
    } else {
      // Append new
      transcripts.push(entry);
    }

    this.state = { ...this.state, transcripts };

    // broadcast update
    this.notifyRenderer();
  }

  addReplySuggestion(s: ReplySuggestion): void {
    this.state = { ...this.state, replySuggestions: [...this.state.replySuggestions, s] };
    this.notifyRenderer();
  }

  addCodeSuggestion(s: CodeSuggestion): void {
    this.state = { ...this.state, codeSuggestions: [...this.state.codeSuggestions, s] };
    this.notifyRenderer();
  }

  clearTranscripts(): void {
    this.state = { ...this.state, transcripts: [] };
    this.notifyRenderer();
  }

  clearSuggestions(): void {
    this.state = { ...this.state, replySuggestions: [], codeSuggestions: [] };
    this.notifyRenderer();
  }
}

export const appStateService = new AppStateService();
