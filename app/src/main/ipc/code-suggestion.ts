import { ipcMain } from 'electron';

import { codeSuggestionService } from '../services/code-suggestion.service.js';

export function registerCodeSuggestionHandlers() {
  ipcMain.handle('code-suggestion:clear', async () => {
    await codeSuggestionService.clear();
  });
  ipcMain.handle('code-suggestion:stop', async () => {
    await codeSuggestionService.stop();
  });
}
