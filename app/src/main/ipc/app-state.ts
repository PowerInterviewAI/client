/**
 * App state IPC handlers
 */

import { ipcMain } from 'electron';
import { appStateService } from '../services/app-state.service.js';

export function registerAppStateHandlers(): void {
  // Get current app state
  ipcMain.handle('app:get-state', async () => {
    return appStateService.getState();
  });

  // Update app state
  ipcMain.handle('app:update-state', async (_event, updates) => {
    appStateService.updateState(updates);
    return appStateService.getState();
  });

  // Add transcript
  ipcMain.handle('app:add-transcript', async (_event, transcript) => {
    appStateService.addTranscript(transcript);
    return appStateService.getState();
  });

  // Add reply suggestion
  ipcMain.handle('app:add-reply-suggestion', async (_event, suggestion) => {
    appStateService.addReplySuggestion(suggestion);
    return appStateService.getState();
  });

  // Add code suggestion
  ipcMain.handle('app:add-code-suggestion', async (_event, suggestion) => {
    appStateService.addCodeSuggestion(suggestion);
    return appStateService.getState();
  });

  // Clear transcripts
  ipcMain.handle('app:clear-transcripts', async () => {
    appStateService.clearTranscripts();
    return appStateService.getState();
  });

  // Clear suggestions
  ipcMain.handle('app:clear-suggestions', async () => {
    appStateService.clearSuggestions();
    return appStateService.getState();
  });
}
