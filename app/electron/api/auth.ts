/**
 * Authentication API
 * Handles user authentication
 */

import { ApiClient, ApiResponse } from './client.js';
import { AuthToken, AuthCredentials } from '../types/auth.js';

export class AuthApi {
  constructor(private client: ApiClient) {}

  /**
   * Login with credentials
   */
  async login(credentials: AuthCredentials): Promise<ApiResponse<AuthToken>> {
    return this.client.post<AuthToken>('/auth/login', credentials);
  }

  /**
   * Logout current session
   */
  async logout(): Promise<ApiResponse<void>> {
    return this.client.post<void>('/auth/logout');
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthToken>> {
    return this.client.post<AuthToken>('/auth/refresh', { refreshToken });
  }

  /**
   * Verify current session
   */
  async verifySession(): Promise<ApiResponse<{ valid: boolean }>> {
    return this.client.get<{ valid: boolean }>('/auth/verify');
  }

  /**
   * Register new user
   */
  async register(data: AuthCredentials & { name: string }): Promise<ApiResponse<AuthToken>> {
    return this.client.post<AuthToken>('/auth/register', data);
  }
}
