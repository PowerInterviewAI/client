/**
 * Application Configuration
 * Central configuration for the Power Interview desktop app
 */

import { EnvUtil } from '../utils/env.js';

export interface AppConfig {
  // Server settings
  serverUrl: string;
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadDefaults();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadDefaults(): AppConfig {
    const apiBaseUrl = EnvUtil.isDev()
      ? 'http://localhost:8000/api'
      : 'https://power-interview-backend.onrender.com';

    return {
      serverUrl: apiBaseUrl,
    };
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AppConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
    this.config[key] = value;
  }
}

export const configManager = ConfigManager.getInstance();
export const getConfig = () => configManager.getConfig();
