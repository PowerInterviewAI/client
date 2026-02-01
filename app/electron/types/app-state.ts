/**
 * Application State Types
 */

export interface AppState {
  isRunning: boolean;
  isStealth: boolean;
  isRecording: boolean;
  currentSession?: Session;
  devices: DeviceInfo[];
}

export interface Session {
  id: string;
  startedAt: Date;
  endedAt?: Date;
  transcript: TranscriptEntry[];
  suggestions: Suggestion[];
}

export interface TranscriptEntry {
  id: string;
  timestamp: Date;
  text: string;
  speaker: 'user' | 'interviewer' | 'system';
  confidence?: number;
}

export interface Suggestion {
  id: string;
  type: 'code' | 'reply' | 'general';
  content: string;
  confidence: number;
  timestamp: Date;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'audio-input' | 'audio-output' | 'video-input';
  isDefault: boolean;
}
