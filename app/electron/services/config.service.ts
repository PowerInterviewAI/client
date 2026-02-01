/**
 * Configuration Service
 * Manages persistent application configuration locally
 */

import { ipcMain } from 'electron';
import ElectronStore from 'electron-store';
import { AppConfig, configManager } from '../config/app.js';

// Runtime configuration (matches Config type in frontend)
export interface RuntimeConfig {
  interview_conf: {
    photo: string;
    username: string;
    profile_data: string;
    job_description: string;
  };
  language: string;
  email: string;
  password: string;
  audio_input_device_name: string;
  face_swap: boolean;
  camera_device_name: string;
  video_width: number;
  video_height: number;
  enable_face_enhance: boolean;
  audio_delay_ms: number;
}

// Default runtime configuration
const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  interview_conf: {
    photo: '',
    username: '',
    profile_data: '',
    job_description: '',
  },
  language: 'en',
  email: '',
  password: '',
  audio_input_device_name: '',
  face_swap: false,
  camera_device_name: '',
  video_width: 1280,
  video_height: 720,
  enable_face_enhance: false,
  audio_delay_ms: 0,
};

interface StoredConfig {
  app?: Partial<AppConfig>;
  window?: {
    bounds?: { x: number; y: number; width: number; height: number };
    stealth?: boolean;
  };
  user?: {
    preferences?: Record<string, any>;
  };
  runtime?: Partial<RuntimeConfig>;
}

export class ConfigService {
  private store: ElectronStore<StoredConfig>;
  private static instance: ConfigService;

  private constructor() {
    this.store = new ElectronStore<StoredConfig>({
      name: 'config',
      defaults: {
        runtime: DEFAULT_RUNTIME_CONFIG,
      },
    });
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Register IPC handlers for frontend hooks
   */
  registerHandlers(): void {
    // Handle config queries
    ipcMain.handle('config:get', async () => {
      try {
        return this.getConfig();
      } catch (error) {
        console.error('Failed to get config:', error);
        throw error;
      }
    });

    // Handle config updates
    ipcMain.handle('config:update', async (_event, updates: Partial<RuntimeConfig>) => {
      try {
        return this.updateConfig(updates);
      } catch (error) {
        console.error('Failed to update config:', error);
        throw error;
      }
    });
  }

  /**
   * Get runtime configuration from local store
   */
  getConfig(): RuntimeConfig {
    const config = this.store.get('runtime', DEFAULT_RUNTIME_CONFIG);
    return { ...DEFAULT_RUNTIME_CONFIG, ...config } as RuntimeConfig;
  }

  /**
   * Update runtime configuration in local store
   */
  updateConfig(updates: Partial<RuntimeConfig>): RuntimeConfig {
    const current = this.getConfig();
    const updated = { ...current, ...updates };
    
    // Deep merge interview_conf if it's being partially updated
    if (updates.interview_conf) {
      updated.interview_conf = {
        ...current.interview_conf,
        ...updates.interview_conf,
      };
    }
    
    this.store.set('runtime', updated);
    return updated;
  }

  /**
   * Reset runtime configuration to defaults
   */
  resetRuntimeConfig(): RuntimeConfig {
    this.store.set('runtime', DEFAULT_RUNTIME_CONFIG);
    return DEFAULT_RUNTIME_CONFIG;
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

  /**
   * Get specific config value
   */
  getConfigValue<K extends keyof RuntimeConfig>(key: K): RuntimeConfig[K] {
    const config = this.getConfig();
    return config[key];
  }

  /**
   * Set specific config value
   */
  setConfigValue<K extends keyof RuntimeConfig>(key: K, value: RuntimeConfig[K]): RuntimeConfig {
    return this.updateConfig({ [key]: value } as Partial<RuntimeConfig>);
  }
}

export const configService = ConfigService.getInstance();