/**
 * Configuration Service
 * Manages persistent application configuration
 */

import ElectronStore from 'electron-store';
import { AppConfig, configManager } from '../config/app.js';

interface StoredConfig {
  app?: Partial<AppConfig>;
  window?: {
    bounds?: { x: number; y: number; width: number; height: number };
    stealth?: boolean;
  };
  user?: {
    preferences?: Record<string, any>;
  };
}

export class ConfigService {
  private store: ElectronStore<StoredConfig>;
  private static instance: ConfigService;

  private constructor() {
    this.store = new ElectronStore<StoredConfig>({
      name: 'config',
      defaults: {},
    });
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Load configuration from disk
   */
  load(): void {
    const stored = this.store.get('app', {});
    configManager.updateConfig(stored);
  }

  /**
   * Save configuration to disk
   */
  save(updates: Partial<AppConfig>): void {
    const current = this.store.get('app', {});
    this.store.set('app', { ...current, ...updates });
    configManager.updateConfig(updates);
  }

  /**
   * Get all configuration
   */
  getAll(): StoredConfig {
    return this.store.store;
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.store.clear();
    configManager.updateConfig(configManager.getConfig());
  }

  /**
   * Get window configuration
   */
  getWindow(): StoredConfig['window'] {
    return this.store.get('window', {});
  }

  /**
   * Save window configuration
   */
  saveWindow(config: StoredConfig['window']): void {
    this.store.set('window', config);
  }

  /**
   * Get user preferences
   */
  getPreferences(): Record<string, any> {
    return this.store.get('user.preferences', {});
  }

  /**
   * Save user preferences
   */
  savePreferences(preferences: Record<string, any>): void {
    this.store.set('user.preferences', preferences);
  }
}

export const configService = ConfigService.getInstance();
