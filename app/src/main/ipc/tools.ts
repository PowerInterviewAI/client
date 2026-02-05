import { ipcMain } from 'electron';
import { toolsService } from '../services/tools-service.js';

export function registerToolsHandlers() {
  ipcMain.handle('tools:export-transcript', async () => {
    await toolsService.exportTranscript();
  });
}
