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

    // Checked before the request, not after. Summarizing an empty interview is a billed model
    // call whose only possible output is invented, and it lands in a document the candidate is
    // told is a record of their interview. The export button is live whenever the assistant is
    // idle, which includes every launch before the first session.
    if (transcripts.length === 0 && suggestions.length === 0) {
      throw new Error('There is nothing to export yet. Run an interview first.');
    }

    // Call the API to generate the summary text
    const conf = configStore.getConfig();
    const response = await this.llmApi.generateSummary({
      config: conf.llmConf,
      username,
      transcripts,
      // The exported report is written in the interview's language too. A Spanish interview
      // summarised in English is a document the candidate cannot hand to anyone involved in it.
      language: conf.language,
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
