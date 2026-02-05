import { convertMarkdownToDocx, downloadDocx } from '@mohtasham/md-to-docx';
import { ApiClient } from '../api/client.js';
import { configStore } from '../store/config-store.js';
import { Transcript } from '../types/app-state.js';
import { appStateService } from './app-state.service.js';

interface GenerateSummarizeRequest {
  username: string;
  transcripts: Transcript[];
}

class ToolsService {
  private apiClient: ApiClient = new ApiClient();

  async exportTranscript(): Promise<void> {
    // Prepare request data
    const username = configStore.getConfig().interview_conf.username;
    const transcripts = appStateService.getState().transcripts;

    // Call the API to export the transcript
    const response = await this.apiClient.post<string>('/api/llm/summarize', {
      username,
      transcripts,
    } as GenerateSummarizeRequest);
    if (response.error) {
      throw new Error(response.error.message);
    }
    // Convert Markdown to DOCX
    const exportMarkdown = response.data;
    if (!exportMarkdown) {
      throw new Error('No transcript data received from server.');
    }
    const docxBlob = await convertMarkdownToDocx(exportMarkdown);
    try {
      const { dialog } = await import('electron');
      const fs = await import('fs/promises');

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save Transcript',
        defaultPath: 'transcript.docx',
        filters: [{ name: 'Word Document', extensions: ['docx'] }],
      });

      if (canceled || !filePath) return;

      await fs.writeFile(filePath, Buffer.from(await docxBlob.arrayBuffer()));
    } catch (err) {
      throw err;
    }
  }
}

export const toolsService = new ToolsService();
