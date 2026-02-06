/**
 * Reply Suggestion Service
 * Generates natural language reply suggestions for interviews
 *
 * Based on the Python equivalent with threading and streaming support
 */

import { ApiClient } from '../api/client.js';
import { REPLY_SUGGESTION_NO_SUGGESTION } from '../consts.js';
import { configStore } from '../store/config.store.js';
import { ReplySuggestion, Speaker, SuggestionState, Transcript } from '../types/app-state.js';
import { DateTimeUtil } from '../utils/datetime.js';
import { UuidUtil } from '../utils/uuid.js';
import { appStateService } from './app-state.service.js';

interface GenerateReplySuggestionRequest {
  username: string;
  profile_data: string;
  job_description: string;
  transcripts: Transcript[];
}

class ReplySuggestionService {
  private apiClient: ApiClient = new ApiClient();
  private suggestions: Map<number, ReplySuggestion> = new Map();
  private abortMap: Map<string, boolean> = new Map();

  /**
   * Clear all suggestions and stop current task
   */
  async clear(): Promise<void> {
    this.stopRunningTasks();
    this.suggestions.clear();
    // Update app state
    appStateService.updateState({ replySuggestions: [] });
  }

  private apendSuggestion(timestamp: number, suggestion: ReplySuggestion): void {
    if (
      suggestion.answer.length > 0 &&
      REPLY_SUGGESTION_NO_SUGGESTION.startsWith(suggestion.answer)
    ) {
      this.suggestions.delete(timestamp);
    } else {
      this.suggestions.set(timestamp, suggestion);
    }
    appStateService.updateState({
      replySuggestions: Array.from(this.suggestions.values()),
    });
  }

  /**
   * Generate suggestion synchronously (main worker method)
   */
  private async generateSuggestion(taskId: string, transcripts: Transcript[]): Promise<void> {
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

    // Append initial suggestion
    this.apendSuggestion(timestamp, suggestion);

    try {
      const conf = configStore.getConfig();
      const requestBody: GenerateReplySuggestionRequest = {
        username: conf.interviewConf.username,
        profile_data: conf.interviewConf.profileData,
        job_description: conf.interviewConf.jobDescription,
        transcripts: transcripts,
      };

      const response = await this.apiClient.postStream('/api/llm/reply-suggestion', requestBody);

      if (!response) {
        throw new Error('No response from reply suggestion API');
      }

      const reader = response.getReader();
      const decoder = new TextDecoder('utf-8');
      try {
        while (true) {
          // Check if stopped
          if (this.abortMap.get(taskId)) {
            this.abortMap.delete(taskId);

            console.log('Suggestion generation aborted by user request');
            suggestion.state = SuggestionState.STOPPED;
            this.apendSuggestion(timestamp, suggestion);
            return;
          }

          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            suggestion.answer += chunk;
            suggestion.state = SuggestionState.LOADING;

            // Update the suggestion
            this.apendSuggestion(timestamp, suggestion);
          }
        }

        // Mark as successful if not stopped
        if (suggestion.state === SuggestionState.LOADING) {
          suggestion.state = SuggestionState.SUCCESS;
          this.apendSuggestion(timestamp, suggestion);
        }
      } finally {
        reader.releaseLock();
      }
    } catch {
      console.error('Failed to generate suggestion');
      suggestion.state = SuggestionState.ERROR;

      this.apendSuggestion(timestamp, suggestion);
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
    this.stopRunningTasks();

    // Start the background task
    const taskId = UuidUtil.generate();
    this.abortMap.set(taskId, false);
    this.generateSuggestion(taskId, filteredTranscripts);
  }

  /**
   * Stop current task safely
   */
  stopRunningTasks(): void {
    this.abortMap.forEach((_value, key) => {
      this.abortMap.set(key, true);
    });
  }

  async stop(): Promise<void> {
    this.stopRunningTasks();
  }
}

export const replySuggestionService = new ReplySuggestionService();
