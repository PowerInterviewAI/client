import { convertMarkdownToDocx } from '@mohtasham/md-to-docx';
import { dialog } from 'electron';
import fs from 'fs/promises';

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

  private generateFilename(): string {
    const d = new Date();

    const pad = (n: number) => String(n).padStart(2, '0');

    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const min = pad(d.getMinutes());
    const ss = pad(d.getSeconds());

    return `report-${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.docx`;
  }

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

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Save Transcript',
      defaultPath: this.generateFilename(),
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    });

    if (canceled || !filePath) return;

    await fs.writeFile(filePath, Buffer.from(await docxBlob.arrayBuffer()));
  }
}

export const toolsService = new ToolsService();
