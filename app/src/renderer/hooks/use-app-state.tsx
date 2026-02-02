/**
 * App State Context
 * Lightweight state management using React Context
 * All state is stored in Electron and accessed via IPC
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { type AppState } from '@/types/app-state';

interface AppStateContextType {
  appState: AppState | null;
  refreshState: () => Promise<void>;
  addTranscript: (transcript: {
    text: string;
    isFinal: boolean;
    speaker: 'user' | 'interviewer';
    timestamp: Date;
  }) => Promise<void>;
  updateAppState: (updates: Partial<AppState>) => Promise<void>;
}

// Singleton manager persisted across HMR to provide a single source of truth
const GLOBAL_KEY = '__APP_STATE_MANAGER__';
const globalAny = globalThis as any;

type Subscriber = (s: AppState | null) => void;

class AppStateManager {
  state: AppState | null = null;
  subscribers = new Set<Subscriber>();
  pollingId: number | null = null;
  unsubscribeIPC: (() => void) | null = null;
  initialized = false;

  normalize(raw: any): AppState | null {
    if (!raw) return null;
    return {
      isLoggedIn: raw.isLoggedIn,
      assistantState: raw.assistantState,
      transcripts: raw.transcripts ?? [],
      replySuggestions: raw.replySuggestions ?? [],
      codeSuggestions: raw.codeSuggestions ?? [],
      isBackendLive: raw.isBackendLive,
      isGpuServerLive: raw.isGpuServerLive,
    };
  }

  emit() {
    for (const s of this.subscribers) s(this.state);
  }

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    await this.refreshState();

    if (window.electronAPI?.onAppStateUpdated) {
      this.unsubscribeIPC = window.electronAPI.onAppStateUpdated((raw: any) => {
        this.state = this.normalize(raw);
        this.emit();
      });
    } else {
      this.pollingId = window.setInterval(() => void this.refreshState(), 1000);
    }
  }

  async refreshState() {
    try {
      if (!window.electronAPI?.appState) return;
      const raw = await window.electronAPI.appState.get();
      this.state = this.normalize(raw);
      this.emit();
    } catch (err) {
      console.error('[AppStateManager] refreshState failed', err);
    }
  }

  async addTranscript(transcript: {
    text: string;
    isFinal: boolean;
    speaker: 'user' | 'interviewer';
    timestamp: Date;
  }) {
    try {
      if (!window.electronAPI?.appState) return;
      const raw = await window.electronAPI.appState.addTranscript(transcript);
      this.state = this.normalize(raw);
      this.emit();
    } catch (err) {
      console.error('[AppStateManager] addTranscript failed', err);
    }
  }

  async updateAppState(updates: Partial<AppState>) {
    try {
      if (!window.electronAPI?.appState) return;
      const raw = await window.electronAPI.appState.update(updates);
      this.state = this.normalize(raw);
      this.emit();
    } catch (err) {
      console.error('[AppStateManager] updateAppState failed', err);
    }
  }

  subscribe(fn: Subscriber) {
    this.subscribers.add(fn);
    // lazy init when first subscriber registers
    void this.init();
    // emit current value synchronously
    fn(this.state);
    return () => {
      this.subscribers.delete(fn);
      if (this.subscribers.size === 0) {
        // stop polling/ipc when no subscribers
        if (this.pollingId) {
          clearInterval(this.pollingId);
          this.pollingId = null;
        }
        if (this.unsubscribeIPC) {
          this.unsubscribeIPC();
          this.unsubscribeIPC = null;
        }
        this.initialized = false;
      }
    };
  }
}

const manager: AppStateManager =
  globalAny[GLOBAL_KEY] ?? (globalAny[GLOBAL_KEY] = new AppStateManager());

export const useAppState = (): AppStateContextType => {
  const [appState, setAppState] = useState<AppState | null>(manager.state);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const unsub = manager.subscribe((s) => {
      if (isMounted.current) setAppState(s);
    });
    return () => {
      isMounted.current = false;
      unsub();
    };
  }, []);

  const refreshState = useCallback(async () => {
    await manager.refreshState();
  }, []);

  const addTranscript = useCallback(
    async (transcript: {
      text: string;
      isFinal: boolean;
      speaker: 'user' | 'interviewer';
      timestamp: Date;
    }) => {
      await manager.addTranscript(transcript);
    },
    []
  );

  const updateAppState = useCallback(async (updates: Partial<AppState>) => {
    await manager.updateAppState(updates);
  }, []);

  return useMemo(
    () => ({ appState, refreshState, addTranscript, updateAppState }),
    [appState, refreshState, addTranscript, updateAppState]
  );
};
