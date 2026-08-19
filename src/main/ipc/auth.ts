import { ipcMain } from 'electron';

import { authService } from '../services/auth.service.js';

export function registerAuthHandlers(): void {
  // Send verification code
  ipcMain.handle('auth:send-verification-code', async (_event, email: string) => {
    return authService.sendVerificationCode(email);
  });

  // Verify email code
  ipcMain.handle('auth:verify-email-code', async (_event, email: string, code: string) => {
    return authService.verifyEmailCode(email, code);
  });

  // Signup
  ipcMain.handle(
    'auth:signup',
    async (_event, username: string, email: string, password: string, verificationCode: string) => {
      return authService.signup(username, email, password, verificationCode);
    }
  );

  // Login
  ipcMain.handle('auth:login', async (_event, email: string, password: string) => {
    return authService.login(email, password);
  });

  // Logout
  ipcMain.handle('auth:logout', async () => {
    return authService.logout();
  });

  // Change password
  ipcMain.handle(
    'auth:change-password',
    async (_event, currentPassword: string, newPassword: string) => {
      return authService.changePassword(currentPassword, newPassword);
    }
  );

  // Request a password reset code
  ipcMain.handle('auth:forgot-password', async (_event, email: string) => {
    return authService.forgotPassword(email);
  });

  // Verify a password reset code
  ipcMain.handle('auth:verify-password-reset-code', async (_event, email: string, code: string) => {
    return authService.verifyPasswordResetCode(email, code);
  });

  // Set a new password from a reset code
  ipcMain.handle(
    'auth:reset-password',
    async (_event, email: string, code: string, newPassword: string) => {
      return authService.resetPassword(email, code, newPassword);
    }
  );
}
