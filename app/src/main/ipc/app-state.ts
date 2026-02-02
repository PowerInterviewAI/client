/**
 * App state IPC handlers
 */

import { ipcMain } from 'electron';
import { healthCheckService } from '../services/health-check.service.js';

export function registerAppStateHandlers(): void {
  // Get current app state
  ipcMain.handle('app:get-state', async () => {
    return healthCheckService.getAppState();
  });

  // Update app state
  ipcMain.handle('app:update-state', async (_event, updates) => {
    healthCheckService.updateAppState(updates);
    return healthCheckService.getAppState();
  });

  // Add transcript
  ipcMain.handle('app:add-transcript', async (_event, transcript) => {
    healthCheckService.addTranscript(transcript);
    return healthCheckService.getAppState();
  });

  // Add reply suggestion
  ipcMain.handle('app:add-reply-suggestion', async (_event, suggestion) => {
    healthCheckService.addReplySuggestion(suggestion);
    return healthCheckService.getAppState();
  });

  // Add code suggestion
  ipcMain.handle('app:add-code-suggestion', async (_event, suggestion) => {
    healthCheckService.addCodeSuggestion(suggestion);
    return healthCheckService.getAppState();
  });

  // Clear transcripts
  ipcMain.handle('app:clear-transcripts', async () => {
    healthCheckService.clearTranscripts();
    return healthCheckService.getAppState();
  });

  // Clear suggestions
  ipcMain.handle('app:clear-suggestions', async () => {
    healthCheckService.clearSuggestions();
    return healthCheckService.getAppState();
  });
}
