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
}
