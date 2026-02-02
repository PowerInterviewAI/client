/**
 * Authentication Store
 * Securely stores authentication credentials using electron-store
 */

import Store from 'electron-store';

interface AuthData {
  email: string;
  password: string;
  token?: string;
  lastLoginAt?: string;
}

interface StoreSchema {
  auth: AuthData;
}

class AuthStore {
  private store: Store<StoreSchema>;

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'auth',
      encryptionKey: 'power-interview-auth-key', // In production, use a proper key
      clearInvalidConfig: true,
    });
  }

  /**
   * Save authentication credentials
   */
  saveCredentials(email: string, password: string, token?: string): void {
    this.store.set('auth', {
      email,
      password,
      token,
      lastLoginAt: new Date().toISOString(),
    });
  }

  /**
   * Get saved credentials
   */
  getCredentials(): AuthData | null {
    if (!this.store.has('auth')) {
      return null;
    }
    return this.store.get('auth');
  }

  /**
   * Update token only
   */
  updateToken(token: string): void {
    const existing = this.getCredentials();
    if (existing) {
      this.store.set('auth', {
        ...existing,
        token,
        lastLoginAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Clear all credentials
   */
  clearCredentials(): void {
    this.store.delete('auth');
  }

  /**
   * Check if credentials exist
   */
  hasCredentials(): boolean {
    return this.store.has('auth');
  }
}

export const authStore = new AuthStore();
