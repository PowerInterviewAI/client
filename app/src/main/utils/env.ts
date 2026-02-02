/**
 * Environment utility functions
 */

export class EnvUtil {
  /**
   * Check if running in development mode
   */
  static isDev(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Check if running in production mode
   */
  static isProd(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Check if running in test mode
   */
  static isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  /**
   * Get environment variable with default
   */
  static get(key: string, defaultValue = ''): string {
    return process.env[key] ?? defaultValue;
  }

  /**
   * Get environment variable as number
   */
  static getNumber(key: string, defaultValue = 0): number {
    const value = process.env[key];
    return value ? parseInt(value, 10) : defaultValue;
  }

  /**
   * Get environment variable as boolean
   */
  static getBoolean(key: string, defaultValue = false): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  /**
   * Check if variable is set
   */
  static has(key: string): boolean {
    return key in process.env;
  }
}
