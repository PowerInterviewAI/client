/**
 * Authentication API
 * Handles user authentication
 */

import { ApiClient, ApiResponse } from './client.js';
import { AuthToken, AuthCredentials } from '../types/auth.js';

export class AuthApi extends ApiClient {
  /**
   * Login with credentials
   */
  async login(credentials: AuthCredentials): Promise<ApiResponse<AuthToken>> {
    return this.post<AuthToken>('/auth/login', credentials);
  }

  /**
   * Logout current session
   */
  async logout(): Promise<ApiResponse<void>> {
    return this.post<void>('/auth/logout');
  }

  /**
   * Register new user
   */
  async register(data: AuthCredentials & { name: string }): Promise<ApiResponse<AuthToken>> {
    return this.post<AuthToken>('/auth/register', data);
  }
}
