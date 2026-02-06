/**
 * Configuration Store
 * Manages persistent application configuration locally
 */

import ElectronStore from 'electron-store';

// Runtime configuration (matches Config type in frontend)
export interface RuntimeConfig {
  interview_conf: {
    photo: string;
    username: string;
    profile_data: string;
    job_description: string;
  };
  language: string;
  session_token: string;
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
  session_token: '',
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
  window?: {
    bounds?: { x: number; y: number; width: number; height: number };
    stealth?: boolean;
  };
  runtime?: Partial<RuntimeConfig>;
}

class ConfigStore {
  private store: ElectronStore<StoredConfig>;

  constructor() {
    this.store = new ElectronStore<StoredConfig>({
      name: 'config',
      defaults: {
        runtime: DEFAULT_RUNTIME_CONFIG,
      },
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
   * Get window bounds
   */
  getWindowBounds(): { x?: number; y?: number; width: number; height: number } | undefined {
    return this.store.get('window.bounds');
  }

  /**
   * Save window bounds
   */
  saveWindowBounds(bounds: { x?: number; y?: number; width: number; height: number }): void {
    this.store.set('window.bounds', bounds);
  }

  /**
   * Get stealth mode state
   */
  getStealth(): boolean {
    return this.store.get('window.stealth', false);
  }

  /**
   * Set stealth mode state
   */
  setStealth(enabled: boolean): void {
    this.store.set('window.stealth', enabled);
  }
}

export const configStore = new ConfigStore();
