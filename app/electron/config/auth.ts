/**
 * Authentication Configuration
 */

export interface AuthConfig {
  sessionTokenCookieName: string;
  sessionTimeout: number; // milliseconds
  maxSessionAge: number; // milliseconds
}

export const authConfig: AuthConfig = {
  sessionTokenCookieName: 'session_token',
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  maxSessionAge: 24 * 60 * 60 * 1000, // 24 hours
};
