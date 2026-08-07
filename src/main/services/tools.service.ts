import { convertMarkdownToDocx } from '@mohtasham/md-to-docx';
import { dialog } from 'electron';
import fs from 'fs/promises';

import { LLMApi } from '../api/llm.js';
import { configStore } from '../store/config.store.js';
import { ExportFormat } from '../types/export.js';
import { GenerateSummarizeRequest } from '../types/llm.js';
import { buildExportMarkdown, generateExportFilename } from '../utils/export-markdown.js';
import { appStateService } from './app-state.service.js';
import { actionSuggestionService } from './suggestion-action.service.js';
import { liveSuggestionService } from './suggestion-live.service.js';
import { transcriptService } from './transcript.service.js';

class ToolsService {
  private llmApi: LLMApi = new LLMApi();

  async exportTranscript(format: ExportFormat = 'docx'): Promise<string | null> {
    // Prepare request data
    const username = appStateService.getState().interviewConfig.fullName;
    const transcripts = appStateService.getState().transcripts;
    const suggestions = appStateService.getState().liveSuggestions;

    // Call the API to generate the summary text
    const response = await this.llmApi.generateSummary({
      config: configStore.getConfig().llmConf,
      username,
      transcripts,
    } as GenerateSummarizeRequest);
    if (response.error) {
      throw new Error(response.error.message);
    }

    const fullMarkdown = buildExportMarkdown({
      username,
      summary: response.data ?? '',
      transcripts,
      suggestions,
    });

    const isMarkdown = format === 'md';

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Transcript',
      defaultPath: generateExportFilename(format),
      filters: isMarkdown
        ? [{ name: 'Markdown', extensions: ['md'] }]
        : [{ name: 'Word Document', extensions: ['docx'] }],
    });

    if (canceled || !filePath) return null;

    if (isMarkdown) {
      await fs.writeFile(filePath, fullMarkdown, 'utf8');
      return filePath;
    }

    const docxBlob = await convertMarkdownToDocx(fullMarkdown, {
      documentType: 'document',
      style: {
        heading1Alignment: 'CENTER',
        heading5Alignment: 'CENTER',
      },
    });

    await fs.writeFile(filePath, Buffer.from(await docxBlob.arrayBuffer()));
    return filePath;
  }

  async clearAll(): Promise<void> {
    // Clear in-memory state
    transcriptService.clear();
    liveSuggestionService.clear();
    actionSuggestionService.clear();
  }

  async setPlaceholderData(): Promise<void> {
    appStateService.setPlaceholderState();
  }
}

export const toolsService = new ToolsService();
