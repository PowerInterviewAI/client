/**
 * Transcript Service
 * Manages interview transcription history
 */

import { EventEmitter } from 'events';
import { TranscriptEntry, Session } from '../types/app-state.js';
import { UuidUtil } from '../utils/uuid.js';

export class TranscriptService extends EventEmitter {
  private static instance: TranscriptService;
  private currentSession: Session | null = null;
  private sessions: Map<string, Session> = new Map();

  private constructor() {
    super();
  }

  static getInstance(): TranscriptService {
    if (!TranscriptService.instance) {
      TranscriptService.instance = new TranscriptService();
    }
    return TranscriptService.instance;
  }

  /**
   * Start a new transcription session
   */
  startSession(): Session {
    const session: Session = {
      id: UuidUtil.generate(),
      startedAt: new Date(),
      transcript: [],
      suggestions: [],
    };

    this.currentSession = session;
    this.sessions.set(session.id, session);
    this.emit('session-started', session);

    return session;
  }

  /**
   * End current session
   */
  endSession(): void {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.endedAt = new Date();
    this.emit('session-ended', this.currentSession);
    this.currentSession = null;
  }

  /**
   * Add transcript entry
   */
  addEntry(entry: Omit<TranscriptEntry, 'id'>): TranscriptEntry {
    if (!this.currentSession) {
      throw new Error('No active session');
    }

    const fullEntry: TranscriptEntry = {
      ...entry,
      id: UuidUtil.generate(),
    };

    this.currentSession.transcript.push(fullEntry);
    this.emit('transcript-updated', fullEntry);

    return fullEntry;
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session by ID
   */
  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  /**
   * Clear all sessions
   */
  clear(): void {
    this.sessions.clear();
    this.currentSession = null;
    this.emit('cleared');
  }

  /**
   * Export session to JSON
   */
  exportSession(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return JSON.stringify(session, null, 2);
  }
}

export const transcriptService = TranscriptService.getInstance();
