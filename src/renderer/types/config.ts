import type { Language } from './language';
import type { LLMConfig } from './llm';

export type { Language };

export interface Config {
  // Interview language: what the ASR transcribes and what suggestions come back in.
  language: Language;

  // Authentication
  sessionToken: string;
  email: string;
  password: string;
  rememberMe: boolean;

  // Transcription options
  audioInputDeviceName: string;

  llmConf: LLMConfig | null;

  // Panel auto-scroll preferences (persisted between sessions)
  autoScrollLiveSuggestions: boolean;
  autoScrollActionSuggestions: boolean;
  autoScrollTranscript: boolean;

  // Transcription bottom dock visibility (persisted between sessions)
  showTranscriptPanel: boolean;

  // Height the user dragged the transcription dock to, in px. null means automatic sizing.
  transcriptDockHeight: number | null;

  // Suggestions come back as headline + keyword bullets instead of full sentences
  professionalMode: boolean;

  // Mock interview: also show what the live assistant would have suggested. On by default.
  mockLiveSuggestionsEnabled: boolean;

  // Which session the control bar's primary Start button launches directly - whichever the
  // candidate last actually started. Defaults to 'mock'.
  lastSessionMode: 'live' | 'mock';
}
