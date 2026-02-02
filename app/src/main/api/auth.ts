/**
 * Authentication API
 * Handles user authentication
 */

import { ApiClient, ApiResponse } from './client.js';
import { AuthToken, ChangePasswordRequest, LoginRequest, SignupRequest } from '../types/auth.js';

export class AuthApi extends ApiClient {
  /**
   * Login with credentials
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthToken>> {
    return this.post('/auth/login', credentials);
  }

  /**
   * Logout current session
   */
  async logout(): Promise<ApiResponse<void>> {
    return this.get<void>('/auth/logout');
  }

  /**
   * Signup new user
   */
  async signup(data: SignupRequest): Promise<ApiResponse<AuthToken>> {
    return this.post('/auth/signup', data);
  }

  /**
   * Change user password
   */
  async changePassword(data: ChangePasswordRequest): Promise<ApiResponse<void>> {
    return this.post<void>('/auth/change-password', data);
  }
}
