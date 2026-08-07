import { LLMApi } from '../api/llm.js';
import {
  LIVE_SUGGESTION_NO_SUGGESTION,
  LIVE_SUGGESTION_TTFB_MS,
  SUGGESTION_STALL_MS,
} from '../consts.js';
import { configStore } from '../store/config.store.js';
import { LiveSuggestion, Speaker, SuggestionState, Transcript } from '../types/app-state.js';
import { GenerateLiveSuggestionRequest } from '../types/llm.js';
import { DateTimeUtil } from '../utils/datetime.js';
import { getSuggestionErrorMessage } from '../utils/suggestion-error.js';
import { UuidUtil } from '../utils/uuid.js';
import { appStateService } from './app-state.service.js';

class LiveSuggestionService {
  private llmApi: LLMApi = new LLMApi();
  private suggestions: Map<number, LiveSuggestion> = new Map();
  private abortMap: Map<string, AbortController> = new Map();

  // Bumped by clear(). An aborted task's rejection lands a microtask after clear() has emptied
  // the map, and without this its terminal write would re-insert a dead session's suggestion
  // into the freshly cleared state.
  private epoch = 0;

  async clear(): Promise<void> {
    this.epoch += 1;
    this.stopRunningTasks();
    this.suggestions.clear();
    // Update app state
    appStateService.updateState({ liveSuggestions: [] });
  }

  private appendSuggestion(timestamp: number, suggestion: LiveSuggestion, epoch: number): void {
    if (epoch !== this.epoch) {
      return;
    }

    if (
      suggestion.answer.length > 0 &&
      LIVE_SUGGESTION_NO_SUGGESTION.startsWith(suggestion.answer)
    ) {
      this.suggestions.delete(timestamp);
    } else {
      this.suggestions.set(timestamp, suggestion);
    }
    appStateService.updateState({
      liveSuggestions: Array.from(this.suggestions.values()),
    });
  }

  private async generateSuggestion(taskId: string, transcripts: Transcript[]): Promise<void> {
    if (!transcripts || transcripts.length === 0) {
      return;
    }

    const epoch = this.epoch;
    const controller = this.abortMap.get(taskId);
    if (!controller) {
      return;
    }

    const timestamp = DateTimeUtil.now();
    const suggestion: LiveSuggestion = {
      timestamp,
      last_question: transcripts[transcripts.length - 1].text,
      answer: '',
      state: SuggestionState.Pending,
      error: '',
    };

    // Append initial suggestion
    this.appendSuggestion(timestamp, suggestion, epoch);

    // A plain resettable timer, not a race against reader.read(): a losing read promise stays
    // pending and has already consumed a read request, so looping would leave two outstanding
    // reads on one reader. Aborting makes the read reject on its own.
    let stallTimer: NodeJS.Timeout | null = null;
    const armStallTimer = (ms: number): void => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        controller.abort(new DOMException('stalled', 'TimeoutError'));
      }, ms);
    };

    try {
      const conf = configStore.getConfig();
      const interviewConfig = appStateService.getState().interviewConfig;
      const requestBody: GenerateLiveSuggestionRequest = {
        config: conf.llmConf,
        profile_data: interviewConfig.profileData,
        context: interviewConfig.context,
        transcripts: transcripts,
      };

      armStallTimer(LIVE_SUGGESTION_TTFB_MS);
      const response = await this.llmApi.generateLiveSuggestions(requestBody, controller.signal);
      if (!response) {
        throw new Error('No response from suggestion API');
      }

      const reader = response.getReader();
      const decoder = new TextDecoder('utf-8');

      // Promote out of Pending as soon as the response exists, not on the first chunk. A
      // stream that yields zero chunks used to leave the card Pending forever: the terminal
      // check below only fires for Loading, and no timeout rescues it because the stream
      // ended rather than stalled. An upstream that emits only a <think> block reaches here
      // with nothing to yield, since _strip_think_stream swallows the whole buffer.
      suggestion.state = SuggestionState.Loading;
      this.appendSuggestion(timestamp, suggestion, epoch);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            armStallTimer(SUGGESTION_STALL_MS);
            const chunk = decoder.decode(value, { stream: true });
            suggestion.answer += chunk;

            // Update the suggestion
            this.appendSuggestion(timestamp, suggestion, epoch);
          }
        }

        if (suggestion.state === SuggestionState.Loading) {
          if (suggestion.answer.length === 0) {
            // Indistinguishable from a provider failure, and a stated error beats a card
            // that never resolves.
            suggestion.state = SuggestionState.Error;
            suggestion.error = 'The model returned an empty response.';
          } else {
            suggestion.state = SuggestionState.Success;
          }
          this.appendSuggestion(timestamp, suggestion, epoch);
        }
      } finally {
        // releaseLock alone does not cancel the body. Undici documents that an unconsumed,
        // uncancelled response body leaks the connection and can stall or deadlock later
        // requests, which is the whole reason superseding used to break suggestions.
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    } catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      const stalled =
        controller.signal.reason instanceof Error &&
        controller.signal.reason.name === 'TimeoutError';

      if (aborted && !stalled) {
        // Superseded by a newer question. Expected, not a failure.
        suggestion.state = SuggestionState.Stopped;
      } else {
        if (!aborted) {
          console.error('[LiveSuggestionService] Failed to generate suggestion:', error);
        }
        suggestion.state = SuggestionState.Error;
        suggestion.error = stalled
          ? 'The response timed out. Please try again.'
          : getSuggestionErrorMessage(error);
      }
      this.appendSuggestion(timestamp, suggestion, epoch);
    } finally {
      if (stallTimer) clearTimeout(stallTimer);
      this.abortMap.delete(taskId);
    }
  }

  async startGenerateSuggestion(transcripts: Transcript[]): Promise<void> {
    // Remove trailing SELF transcripts (same logic as Python)
    const filteredTranscripts = [...transcripts];
    while (
      filteredTranscripts.length > 0 &&
      filteredTranscripts[filteredTranscripts.length - 1].speaker === Speaker.Self
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
    this.abortMap.set(taskId, new AbortController());
    void this.generateSuggestion(taskId, filteredTranscripts);
  }

  stopRunningTasks(): void {
    // Aborting tears down the HTTP request itself, so a parked reader.read() rejects
    // immediately instead of waiting for a chunk that may never arrive.
    this.abortMap.forEach((controller) => controller.abort());
    this.abortMap.clear();
  }

  async stop(): Promise<void> {
    this.stopRunningTasks();
  }
}

export const liveSuggestionService = new LiveSuggestionService();
