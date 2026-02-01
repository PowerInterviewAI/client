/**
 * Application Configuration
 * Central configuration for the Power Interview desktop app
 */

export interface AppConfig {
  // App metadata
  title: string;
  name: string;
  version: string;
  email: string;
  
  // Feature flags
  isDebug: boolean;
  isTest: boolean;
  
  // Server settings
  serverPort: number;
  serverUrl: string;
  
  // Paths
  dataPath: string;
  logsPath: string;
  modelsPath: string;
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
    const isDev = process.env.NODE_ENV === 'development';
    
    return {
      title: 'Power Interview',
      name: 'power-interview',
      version: '0.9.0',
      email: 'admin@power-interview.ai',
      
      isDebug: isDev,
      isTest: process.env.NODE_ENV === 'test',
      
      serverPort: 28080,
      serverUrl: 'http://localhost:28080',
      
      dataPath: '', // Set by app
      logsPath: '', // Set by app
      modelsPath: '', // Set by app
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
