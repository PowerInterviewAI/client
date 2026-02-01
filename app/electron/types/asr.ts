/**
 * ASR (Speech Recognition) Types
 */

export interface AsrResult {
  text: string;
  confidence: number;
  timestamp: Date;
  isFinal: boolean;
  language: string;
}

export interface AsrSegment {
  start: number; // seconds
  end: number;
  text: string;
  confidence: number;
}

export interface AsrOptions {
  language?: string;
  model?: string;
  continuous?: boolean;
  interimResults?: boolean;
}
