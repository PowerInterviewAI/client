/**
 * Audio Recording Service
 * Handles audio capture from microphone
 *
 * SKELETON: Complex implementation requires audio streaming
 */

import { EventEmitter } from 'events';

export class AudioRecordService extends EventEmitter {
  private static instance: AudioRecordService;
  private isRecording = false;

  private constructor() {
    super();
  }

  static getInstance(): AudioRecordService {
    if (!AudioRecordService.instance) {
      AudioRecordService.instance = new AudioRecordService();
    }
    return AudioRecordService.instance;
  }

  /**
   * Start recording audio
   * SKELETON: Implement with node-record-lpcm16 or similar
   */
  async startRecording(deviceId?: string): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    console.log('[AudioRecordService] startRecording - not implemented');
    // TODO: Initialize audio stream
    // - Use node-record-lpcm16 or portaudio
    // - Configure sample rate, channels, encoding
    // - Emit 'data' events with audio buffers

    this.isRecording = true;
    this.emit('started');
  }

  /**
   * Stop recording audio
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      return;
    }

    console.log('[AudioRecordService] stopRecording');
    // TODO: Stop audio stream

    this.isRecording = false;
    this.emit('stopped');
  }

  /**
   * Get recording status
   */
  getStatus(): { isRecording: boolean } {
    return { isRecording: this.isRecording };
  }

  /**
   * Get audio level (volume)
   * SKELETON: Calculate RMS or peak from audio buffer
   */
  getLevel(): number {
    // TODO: Return current audio level (0-100)
    return 0;
  }
}

export const audioRecordService = AudioRecordService.getInstance();
