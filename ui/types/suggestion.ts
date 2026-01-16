export enum SuggestionState {
  IDLE = 'idle',
  PENDING = 'pending',
  LOADING = 'loading',
  SUCCESS = 'success',
  STOPPED = 'stopped',
  ERROR = 'error',
}

export interface ReplySuggestion {
  timestamp: number;
  last_question: string;
  answer: string;
  state: SuggestionState;
}

export interface CodeSuggestion {
  timestamp: number;
  image_urls: string[];
  user_prompt: string | null;
  suggestion_content: string;
  state: SuggestionState;
}
