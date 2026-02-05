/**
 * Code Suggestion Service
 * Generates code suggestions using LLM based on screenshots and transcripts
 */

import screenshot from 'screenshot-desktop';
import sharp from 'sharp';

import { ApiClient } from '../api/client.js';
import { CodeSuggestion, SuggestionState, Transcript } from '../types/app-state.js';
import { DateTimeUtil } from '../utils/datetime.js';
import { UuidUtil } from '../utils/uuid.js';
import { appStateService } from './app-state.service.js';

interface GenerateCodeSuggestionRequest {
  user_prompt?: string;
  image_names: string[];
}

export class CodeSuggestionService {
  private readonly MAX_SCREENSHOTS = 5;

  private apiClient: ApiClient = new ApiClient();
  private uploadedImageNames: string[] = [];
  private suggestions: Map<number, CodeSuggestion> = new Map();
  private abortMap: Map<string, boolean> = new Map();

  // --------------------------
  // Public API
  // --------------------------

  /**
   * Get all suggestions with pending prompt if images are uploaded
   */
  getSuggestions(isUploading: boolean = false, includePrompt: boolean = true): CodeSuggestion[] {
    let suggestionsArray = Array.from(this.suggestions.values());

    if (!includePrompt) {
      return suggestionsArray;
    }

    if (isUploading) {
      const pendingPrompt: CodeSuggestion = {
        timestamp: DateTimeUtil.now(),
        image_urls: [...this.uploadedImageNames.map((name) => this.getBackendImageUrl(name)), null],
        suggestion_content: '',
        state: SuggestionState.UPLOADING,
      };
      suggestionsArray = [...suggestionsArray, pendingPrompt];
    } else if (this.uploadedImageNames.length > 0) {
      const pendingPrompt: CodeSuggestion = {
        timestamp: DateTimeUtil.now(),
        image_urls: this.uploadedImageNames.map((name) => this.getBackendImageUrl(name)),
        suggestion_content: '',
        state: SuggestionState.IDLE,
      };
      suggestionsArray = [...suggestionsArray, pendingPrompt];
    }

    return suggestionsArray;
  }

  /**
   * Clear uploaded images
   */
  clearImages(): void {
    this.uploadedImageNames = [];
    appStateService.updateState({ codeSuggestions: this.getSuggestions() });
  }

  /**
   * Capture screenshot and upload to backend
   */
  async captureScreenshot(): Promise<void> {
    // Enforce maximum screenshots limit
    if (this.uploadedImageNames.length >= this.MAX_SCREENSHOTS) {
      const message = `Maximum screenshots (${this.MAX_SCREENSHOTS}) reached`;
      console.warn('[CodeSuggestionService]', message);
      throw new Error(message);
    }

    // Update app state
    appStateService.updateState({
      codeSuggestions: this.getSuggestions(true),
    });

    // Capture screenshot from main window
    const imageBytes = await this.captureScreenshotAsGrayscale();

    try {
      // Create FormData for file upload
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(imageBytes)], { type: 'image/png' });
      formData.append('image_file', blob, 'screenshot.png');

      // Upload image to backend
      const response = await this.apiClient.postFormData<string>('/api/llm/upload-image', formData);
      if (response.error || !response.data) {
        throw new Error(`Upload failed: ${response.error?.message || 'No filename returned'}`);
      }
      this.uploadedImageNames.push(response.data);

      // Update app state
      appStateService.updateState({ codeSuggestions: this.getSuggestions() });
    } catch (error) {
      console.error('[CodeSuggestionService] Failed to upload image:', error);
      throw error;
    }
  }

  /**
   * Generate code suggestion asynchronously
   */
  async startGenerateSuggestion(transcripts?: Transcript[]): Promise<void> {
    // If there are no uploaded images, there is nothing to suggest from
    if (this.uploadedImageNames.length === 0) {
      return;
    }

    // Cancel any current task
    this.stopRunningTasks();

    // Start new generation
    const taskId = UuidUtil.generate();
    this.abortMap.set(taskId, false);
    this.generateSuggestion(taskId, transcripts);
  }

  /**
   * Stop current suggestion generation
   */
  stopRunningTasks(): void {
    this.abortMap.forEach((_value, key) => {
      this.abortMap.set(key, true);
    });
  }

  // --------------------------
  // Private Methods
  // --------------------------

  /**
   * Build user prompt from transcripts
   */
  private buildUserPrompt(transcripts?: Transcript[]): string | undefined {
    if (!transcripts || transcripts.length === 0) {
      return undefined;
    }

    const parts = transcripts.map((t) => `${t.speaker}: ${t.text}`);
    return parts.join('\n');
  }

  private setSuggestion(timestamp: number, suggestion: CodeSuggestion): void {
    this.suggestions.set(timestamp, suggestion);
    appStateService.updateState({ codeSuggestions: this.getSuggestions(false, false) });
  }

  /**
   * Generate code suggestion and stream response
   */
  private async generateSuggestion(taskId: string, transcripts?: Transcript[]): Promise<void> {
    const timestamp = DateTimeUtil.now();
    const userPrompt = this.buildUserPrompt(transcripts);

    const payload: GenerateCodeSuggestionRequest = {
      user_prompt: userPrompt,
      image_names: [...this.uploadedImageNames],
    };

    // Create initial suggestion
    const suggestion: CodeSuggestion = {
      timestamp,
      image_urls: this.uploadedImageNames.map((name) => this.getBackendImageUrl(name)),
      suggestion_content: '',
      state: SuggestionState.PENDING,
    };
    this.setSuggestion(timestamp, suggestion);

    // Clear uploaded images (they're now part of the request)
    this.uploadedImageNames = [];

    try {
      const stream = await this.apiClient.postStream('api/llm/code-suggestion', payload);
      if (!stream) {
        throw new Error('Failed to get stream response');
      }

      const reader = stream.getReader();
      const decoder = new TextDecoder();

      // Update state to loading
      suggestion.state = SuggestionState.LOADING;
      this.setSuggestion(timestamp, suggestion);

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          // Check if task was stopped
          if (this.abortMap.get(taskId)) {
            this.abortMap.delete(taskId);

            console.info('[CodeSuggestionService] Code suggestion generation stopped by user');
            suggestion.state = SuggestionState.STOPPED;
            this.setSuggestion(timestamp, suggestion);
            return;
          }

          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            suggestion.suggestion_content += chunk;
            suggestion.state = SuggestionState.LOADING;
            this.setSuggestion(timestamp, suggestion);
          }
        }

        // Mark as successful if not stopped
        if (suggestion.state === SuggestionState.LOADING) {
          suggestion.state = SuggestionState.SUCCESS;
          this.setSuggestion(timestamp, suggestion);
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('[CodeSuggestionService] Failed to generate code suggestion:', error);
      suggestion.state = SuggestionState.ERROR;
      this.setSuggestion(timestamp, suggestion);
    }
  }

  /**
   * Get backend image URL
   */
  private getBackendImageUrl(imageName: string): string {
    return `${ApiClient.BACKEND_URL}/api/llm/get-image/${imageName}`;
  }

  /**
   * Capture screenshot from desktop and convert to grayscale PNG
   */
  private async captureScreenshotAsGrayscale(): Promise<Uint8Array> {
    try {
      console.log('[CodeSuggestionService] Capturing desktop screenshots from all displays...');

      // Use screenshot-desktop to capture all displays
      const allScreenshots = await screenshot.all();

      if (!allScreenshots || allScreenshots.length === 0) {
        throw new Error('No screenshots captured from any display');
      }

      console.log(`[CodeSuggestionService] Captured ${allScreenshots.length} display(s)`);

      let combinedBuffer: Buffer;

      if (allScreenshots.length === 1) {
        // Single display - use as-is
        combinedBuffer = allScreenshots[0];
        console.log(`[CodeSuggestionService] Single display: ${combinedBuffer.length} bytes`);
      } else {
        // Multiple displays - combine horizontally
        console.log('[CodeSuggestionService] Combining multiple displays...');

        // Get image metadata for all screenshots
        const imageInfos = await Promise.all(
          allScreenshots.map(async (buffer) => {
            const metadata = await sharp(buffer).metadata();
            return { buffer, width: metadata.width!, height: metadata.height! };
          })
        );

        // Calculate combined dimensions
        const totalWidth = imageInfos.reduce((sum, info) => sum + info.width, 0);
        const maxHeight = Math.max(...imageInfos.map((info) => info.height));

        console.log(`[CodeSuggestionService] Combined dimensions: ${totalWidth}x${maxHeight}`);

        // Create a composite image
        const composite = sharp({
          create: {
            width: totalWidth,
            height: maxHeight,
            channels: 3,
            background: { r: 0, g: 0, b: 0 },
          },
        });

        // Position each screenshot horizontally
        let leftOffset = 0;
        const overlayInputs = imageInfos.map((info) => {
          const input = {
            input: info.buffer,
            left: leftOffset,
            top: 0,
          };
          leftOffset += info.width;
          return input;
        });

        combinedBuffer = await composite.composite(overlayInputs).png().toBuffer();
        console.log(`[CodeSuggestionService] Combined screenshot: ${combinedBuffer.length} bytes`);
      }

      // Use Sharp to convert to grayscale PNG with high efficiency
      const grayscalePngBuffer = await sharp(combinedBuffer)
        .greyscale()
        .png({
          compressionLevel: 6,
          quality: 85,
        })
        .toBuffer();

      console.log(
        `[CodeSuggestionService] Converted to grayscale: ${grayscalePngBuffer.length} bytes`
      );

      return new Uint8Array(grayscalePngBuffer);
    } catch (error) {
      console.error('[CodeSuggestionService] Failed to capture screenshot:', error);
      throw new Error(
        `Screenshot capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clear suggestions (legacy method)
   */
  clear(): void {
    this.stopRunningTasks();
    this.suggestions.clear();
    this.uploadedImageNames = [];
    // Update app state
    appStateService.updateState({ codeSuggestions: [] });
  }
}

export const codeSuggestionService = new CodeSuggestionService();
