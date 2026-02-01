/**
 * ASR (Automatic Speech Recognition) Configuration
 */

export interface AsrConfig {
  enabled: boolean;
  engine: 'whisper' | 'vosk' | 'deepgram';
  model: string;
  language: string;
  sampleRate: number;
  channels: number;
}

export const asrConfig: AsrConfig = {
  enabled: true,
  engine: 'whisper',
  model: 'base.en',
  language: 'en',
  sampleRate: 16000,
  channels: 1,
};
