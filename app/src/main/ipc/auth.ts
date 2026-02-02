/**
 * Auth IPC Handlers
 * Handles authentication-related IPC communication
 */

import { ipcMain } from 'electron';
import { configStore } from '../store/config-store.js';

export function registerAuthHandlers() {
  // Get saved credentials
  ipcMain.handle('auth:getCredentials', () => {
    return {
      email: configStore.getConfig().email,
      password: configStore.getConfig().password,
    };
  });

  // Save credentials after successful login/signup
  ipcMain.handle(
    'auth:saveCredentials',
    (_event, email: string, password: string, token?: string) => {
      configStore.updateConfig({ email, password, session_token: token });
      return { success: true };
    }
  );

  // Update token
  ipcMain.handle('auth:updateToken', (_event, token: string) => {
    configStore.updateConfig({ session_token: token });
    return { success: true };
  });

  // Clear credentials on logout
  ipcMain.handle('auth:clearCredentials', () => {
    configStore.updateConfig({ email: '', password: '', session_token: '' });
    return { success: true };
  });
}
