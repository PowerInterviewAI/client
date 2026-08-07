/**
 * Users API
 * Handles the authenticated user's account and interview configuration
 * (full name, profile, context)
 */

import { UpdateInterviewConfigRequest, UserAccount } from '../types/account.js';
import { ApiClient, ApiResponse } from './client.js';

// These carry the full profile/context payload, so allow well over a plain JSON round-trip,
// but never let a stalled socket leave the request pending forever.
const REQUEST_TIMEOUT_MS = 30_000;

export class UsersApi extends ApiClient {
  /**
   * Get the authenticated user's account
   */
  async getMe(): Promise<ApiResponse<UserAccount>> {
    return this.get<UserAccount>('/api/users/me', undefined, REQUEST_TIMEOUT_MS);
  }

  /**
   * Replace the authenticated user's interview configuration
   */
  async updateInterviewConfig(data: UpdateInterviewConfigRequest): Promise<ApiResponse<UserAccount>> {
    return this.patch<UserAccount>('/api/users/me/interview-config', data, REQUEST_TIMEOUT_MS);
  }
}
