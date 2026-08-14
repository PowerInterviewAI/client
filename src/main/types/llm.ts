import { Transcript } from './app-state.js';

export enum LLMProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GROQ = 'groq',
  GOOGLE = 'google',
}

export enum LLMModality {
  TEXT_INPUT = 'text_input',
  IMAGE_INPUT = 'image_input',
  TEXT_OUTPUT = 'text_output',
  IMAGE_OUTPUT = 'image_output',
  AUDIO_INPUT = 'audio_input',
  AUDIO_OUTPUT = 'audio_output',
}

export interface LLMModelInfo {
  id: string;
  provider: LLMProvider;
  name: string;
  description: string;
  modalities: LLMModality[];
  vision_capable: boolean;
  context_window: number;
  max_output_tokens: number;
  pricing_input: number;
  pricing_output: number;
  supports_streaming: boolean;
  supports_function_calling: boolean;
  supports_json_mode: boolean;
  release_date: string | null;
}

export interface LLMConfig {
  provider: LLMProvider;
  apikey: string;
  model: string;
}

export interface LLMConfigValidationResult {
  provider_ok: boolean;
  apikey_ok: boolean;
  model_ok: boolean;
  error: string;
}

export interface LLMRequest {
  config: LLMConfig | null;
}

/**
 * How much prose a suggestion should carry.
 *
 * Normal is full spoken sentences. Professional is a headline plus keyword bullets, for reading
 * at a glance mid-interview. Mirrors `SuggestionMode` in the backend's `app/schemas/suggestion.py`.
 */
export enum SuggestionMode {
  Normal = 'normal',
  Professional = 'professional',
}

/**
 * What the local gate concluded about the interviewer's last turn.
 *
 * Only two of `TurnVerdict`'s three values travel: a `Skip` never becomes a request at all. The
 * backend runs its own classifier for `Uncertain` and trusts `Answer`, which is what keeps a model
 * call off the path of every plainly answerable question. Mirrors `TurnVerdict` in the backend's
 * `app/schemas/suggestion.py`.
 */
export enum RequestTurnVerdict {
  Answer = 'answer',
  Uncertain = 'uncertain',
}

export interface GenerateLiveSuggestionRequest extends LLMRequest {
  profile_data: string;
  context: string;
  transcripts: Transcript[];
  mode: SuggestionMode;
  turn_verdict?: RequestTurnVerdict;
}

// action request reuses live fields but adds image names
export interface GenerateActionSuggestionRequest extends GenerateLiveSuggestionRequest {
  image_names: string[];
}

// summarize request reuses live fields
export interface GenerateSummarizeRequest extends LLMRequest {
  username: string;
  transcripts: Transcript[];
}
