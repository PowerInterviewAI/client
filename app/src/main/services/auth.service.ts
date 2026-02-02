import { AuthApi } from '../api/auth.js';
import { configStore } from '../store/config-store.js';
import { appStateService } from './app-state.service.js';

/**
 * AuthService
 * Wrapper around the low-level `AuthApi` client that provides
 * higher-level methods used by the application (login, signup,
 * logout, changePassword). Each method returns a simple result
 * object with `success` and optional `error` message to keep
 * caller-side handling straightforward.
 */
export class AuthService {
  // low-level API client used to perform network requests
  private client = new AuthApi();

  /**
   * Create a new account. Returns a simple success/error result.
   */
  async signup(
    username: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    if (email && password) {
      try {
        const response = await this.client.signup({ username, email, password });
        if (response.error) {
          return { success: false, error: response.error.message || 'Signup failed' };
        }
        return { success: true };
      } catch {
        return { success: false, error: 'Signup failed' };
      }
    } else {
      return { success: false, error: 'Invalid email or password' };
    }
  }

  /**
   * Attempt to log a user in with `email` and `password`.
   * On success, updates `configStore` with credentials and session token.
   */
  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (email && password) {
      try {
        const response = await this.client.login({ email, password });
        if (response.error) {
          return { success: false, error: response.error.message || 'Login failed' };
        }

        // persist credentials and session token in the config store
        configStore.updateConfig({ email, password });
        configStore.updateConfig({ session_token: response.data?.session_token });

        // update app state to logged in
        appStateService.updateState({ isLoggedIn: true });

        return { success: true };
      } catch {
        return { success: false, error: 'Login failed' };
      }
    } else {
      return { success: false, error: 'Invalid email or password' };
    }
  }

  /**
   * Log the current user out.
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.client.logout();
      if (response.error) {
        return { success: false, error: response.error.message || 'Logout failed' };
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Logout failed' };
    } finally {
      // clear session token and update app state
      configStore.updateConfig({ session_token: '' });
      appStateService.updateState({ isLoggedIn: false });
    }
  }

  /**
   * Change the authenticated user's password.
   * The API expects `current_password` and `new_password` keys.
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.client.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      if (response.error) {
        return { success: false, error: response.error.message || 'Change password failed' };
      }

      // Update stored password in config store
      configStore.updateConfig({ password: newPassword });

      return { success: true };
    } catch {
      return { success: false, error: 'Change password failed' };
    }
  }
}

export const authService = new AuthService();
