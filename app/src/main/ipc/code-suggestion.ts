import { ipcMain } from 'electron';

import { codeSuggestionService } from '../services/code-suggestion.service.js';

export function registerCodeSuggestionHandlers() {
  ipcMain.handle('code-suggestion:clear', async () => {
    codeSuggestionService.clear();
  });
}
