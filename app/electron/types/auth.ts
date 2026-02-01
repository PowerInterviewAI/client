/**
 * Authentication Types
 */

export interface AuthSession {
  token: string;
  userId: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}
