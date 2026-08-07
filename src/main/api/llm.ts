/**
 * LLM API
 * Handles LLM operations
 */

import {
  GenerateActionSuggestionRequest,
  GenerateLiveSuggestionRequest,
  GenerateSummarizeRequest,
  LLMConfigValidationResult,
  LLMModelInfo,
  LLMRequest,
} from '../types/llm.js';
import { ApiClient, ApiResponse } from './client.js';

export class LLMApi extends ApiClient {
  /**
   * Validate LLM Config
   */
  async validate(request: LLMRequest): Promise<ApiResponse<LLMConfigValidationResult>> {
    return this.post<LLMConfigValidationResult>('/api/llm/validate', request);
  }

  /**
   * List Supported Models
   */
  async listModels(): Promise<ApiResponse<LLMModelInfo[]>> {
    return this.get<LLMModelInfo[]>('/api/llm/models');
  }

  /**
   * Generate Live Suggestions
   */
  async generateLiveSuggestions(
    data: GenerateLiveSuggestionRequest,
    signal?: AbortSignal
  ): Promise<ReadableStream<Uint8Array> | null> {
    return this.postStream('/api/llm/live-suggestion', data, signal);
  }

  /**
   * Upload Image
   */
  async uploadImage(data: FormData): Promise<ApiResponse<string>> {
    return this.postFormData<string>('/api/llm/upload-image', data);
  }

  /**
   * Generate Action Suggestion
   */
  async generateActionSuggestionStream(
    payload: GenerateActionSuggestionRequest,
    signal?: AbortSignal
  ): Promise<ReadableStream<Uint8Array> | null> {
    return this.postStream('api/llm/action-suggestion', payload, signal);
  }

  /**
   * Generate Summary
   */
  async generateSummary(request: GenerateSummarizeRequest): Promise<ApiResponse<string>> {
    return this.post<string>('/api/llm/summarize', request);
  }
}
