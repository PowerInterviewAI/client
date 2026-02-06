/**
 * App State Service
 * Central manager for application runtime state shared across main process
 */

import { AppState, CodeSuggestion, ReplySuggestion, RunningState } from '../types/app-state.js';
import { getWindowReference } from './window-control.service.js';

const DEFAULT_STATE: AppState = {
  isRunning: false,
  isStealth: false,
  isRecording: false,
  isBackendLive: false,
  isGpuServerLive: false,
  isLoggedIn: false,
  runningState: RunningState.IDLE,
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

  addReplySuggestion(s: ReplySuggestion): void {
    this.state = { ...this.state, replySuggestions: [...this.state.replySuggestions, s] };
    this.notifyRenderer();
  }

  addCodeSuggestion(s: CodeSuggestion): void {
    this.state = { ...this.state, codeSuggestions: [...this.state.codeSuggestions, s] };
    this.notifyRenderer();
  }
}

export const appStateService = new AppStateService();
