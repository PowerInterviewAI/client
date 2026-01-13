export enum SuggestionState {
  IDLE = 'idle',
  PENDING = 'pending',
  LOADING = 'loading',
  SUCCESS = 'success',
  STOPPED = 'stopped',
  ERROR = 'error',
}

export interface Suggestion {
  timestamp: number;
  last_question: string;
  answer: string;
  state: SuggestionState;
}

export interface CodeSuggestion {
  timestamp: number;
  thumbs_bytes: string[];
  user_prompt: string;
  suggestion_content: string;
  state: SuggestionState;
}
