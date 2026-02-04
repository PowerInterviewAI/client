/**
 * Reply Suggestion Service
 * Generates natural language reply suggestions for interviews
 *
 * Based on the Python equivalent with threading and streaming support
 */

import { ReplySuggestion, Transcript, SuggestionState, Speaker } from '../types/app-state.js';
import { DateTimeUtil } from '../utils/datetime.js';
import { ApiClient } from '../api/client.js';
import { configStore } from '../store/config-store.js';
import { appStateService } from './app-state.service.js';

interface GenerateReplySuggestionRequest {
  username: string;
  profile_data: string;
  job_description: string;
  transcripts: Transcript[];
}

class ReplySuggestionService {
  private suggestions: Map<number, ReplySuggestion> = new Map();
  private currentAbortController: AbortController | null = null;
  private isGenerating: boolean = false;

  /**
   * Clear all suggestions and stop current task
   */
  clearSuggestions(): void {
    this.stopCurrentTask();
    this.suggestions.clear();
    // Update app state
    appStateService.updateState({ replySuggestions: [] });
  }

  /**
   * Generate suggestion synchronously (main worker method)
   */
  private async generateSuggestion(transcripts: Transcript[]): Promise<void> {
    if (!transcripts || transcripts.length === 0) {
      return;
    }

    const timestamp = DateTimeUtil.now();
    const suggestion: ReplySuggestion = {
      timestamp,
      last_question: transcripts[transcripts.length - 1].text,
      answer: '',
      state: SuggestionState.PENDING,
    };

    // Add to local storage
    this.suggestions.set(timestamp, suggestion);

    // Update app state immediately
    appStateService.updateState({
      replySuggestions: Array.from(this.suggestions.values()),
    });

    try {
      const conf = configStore.getConfig();
      const requestBody: GenerateReplySuggestionRequest = {
        username: conf.interview_conf.username,
        profile_data: conf.interview_conf.profile_data,
        job_description: conf.interview_conf.job_description,
        transcripts: transcripts,
      };

      const apiClient = new ApiClient();
      const response = await apiClient.postStream('/api/llm/reply-suggestion', requestBody);

      if (!response) {
        throw new Error('No response from reply suggestion API');
      }

      const reader = response.getReader();
      const decoder = new TextDecoder('utf-8');
      try {
        while (true) {
          // Check if stopped
          if (this.currentAbortController?.signal.aborted) {
            console.log('Suggestion generation stopped by user');
            suggestion.state = SuggestionState.STOPPED;
            this.suggestions.set(timestamp, suggestion);
            appStateService.updateState({
              replySuggestions: Array.from(this.suggestions.values()),
            });
            return;
          }

          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            suggestion.answer += chunk;
            suggestion.state = SuggestionState.LOADING;

            // Update the suggestion
            this.suggestions.set(timestamp, suggestion);
            appStateService.updateState({
              replySuggestions: Array.from(this.suggestions.values()),
            });
          }
        }

        // Mark as successful if not stopped
        if (suggestion.state === SuggestionState.LOADING) {
          suggestion.state = SuggestionState.SUCCESS;
          this.suggestions.set(timestamp, suggestion);
          appStateService.updateState({
            replySuggestions: Array.from(this.suggestions.values()),
          });
        }
      } finally {
        reader.releaseLock();
      }
    } catch {
      console.error('Failed to generate suggestion');
      suggestion.state = SuggestionState.ERROR;

      this.suggestions.set(timestamp, suggestion);
      appStateService.updateState({
        replySuggestions: Array.from(this.suggestions.values()),
      });
    }
  }

  /**
   * Generate suggestion asynchronously (spawn background task)
   */
  async startGenerateSuggestion(transcripts: Transcript[]): Promise<void> {
    // Remove trailing SELF transcripts (same logic as Python)
    const filteredTranscripts = [...transcripts];
    while (
      filteredTranscripts.length > 0 &&
      filteredTranscripts[filteredTranscripts.length - 1].speaker === Speaker.SELF
    ) {
      filteredTranscripts.pop();
    }

    if (filteredTranscripts.length === 0) {
      return;
    }

    // Cancel current task if running
    this.stopCurrentTask();

    // Create new abort controller
    this.currentAbortController = new AbortController();
    this.isGenerating = true;

    // Start the background task
    try {
      this.generateSuggestion(filteredTranscripts);
    } finally {
      this.isGenerating = false;
      this.currentAbortController = null;
    }
  }

  /**
   * Stop current task safely
   */
  stopCurrentTask(): void {
    if (this.currentAbortController && this.isGenerating) {
      this.currentAbortController.abort();
    }
  }

  /**
   * Check if currently generating
   */
  isCurrentlyGenerating(): boolean {
    return this.isGenerating;
  }
}

export const replySuggestionService = new ReplySuggestionService();
