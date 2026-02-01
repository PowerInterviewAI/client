/**
 * API barrel export
 * Central API client with all endpoints
 */

export * from './client.js';
export * from './auth.js';
export * from './app.js';

import { ApiClient } from './client.js';
import { AuthApi } from './auth.js';
import { AppApi } from './app.js';

/**
 * Main API instance
 */
export class Api {
  public auth: AuthApi;
  public app: AppApi;

  constructor(private client: ApiClient) {
    this.auth = new AuthApi(client);
    this.app = new AppApi(client);
  }

  /**
   * Set authentication token for all requests
   */
  setAuthToken(token: string): void {
    this.client.setAuthToken(token);
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.client.clearAuthToken();
  }
}

/**
 * Create API instance with base URL
 */
export function createApi(baseUrl: string): Api {
  const client = new ApiClient(baseUrl);
  return new Api(client);
}
