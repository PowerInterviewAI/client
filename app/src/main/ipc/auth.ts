/**
 * Auth IPC Handlers
 * Handles authentication-related IPC communication
 */

import { ipcMain } from 'electron';
import { authStore } from '../store/auth-store.js';

export function registerAuthHandlers() {
  // Get saved credentials
  ipcMain.handle('auth:getCredentials', () => {
    return authStore.getCredentials();
  });

  // Save credentials after successful login/signup
  ipcMain.handle(
    'auth:saveCredentials',
    (_event, email: string, password: string, token?: string) => {
      authStore.saveCredentials(email, password, token);
      return { success: true };
    }
  );

  // Update token
  ipcMain.handle('auth:updateToken', (_event, token: string) => {
    authStore.updateToken(token);
    return { success: true };
  });

  // Clear credentials on logout
  ipcMain.handle('auth:clearCredentials', () => {
    authStore.clearCredentials();
    return { success: true };
  });

  // Check if credentials exist
  ipcMain.handle('auth:hasCredentials', () => {
    return authStore.hasCredentials();
  });
}
