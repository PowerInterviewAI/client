import { ipcMain } from 'electron';

import { replySuggestionService } from '../services/reply-suggestion.service.js';

export function registerReplySuggestionHandlers() {
  ipcMain.handle('reply-suggestion:clear', async () => {
    await replySuggestionService.clear();
  });
  ipcMain.handle('reply-suggestion:stop', async () => {
    await replySuggestionService.stop();
  });
}
