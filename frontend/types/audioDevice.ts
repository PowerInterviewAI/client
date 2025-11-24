export interface PyAudioDevice {
  index: number;
  structVersion: number;
  name: string;
  hostApi: number;
  maxInputChannels: number;
  maxOutputChannels: number;
  defaultLowInputLatency: number;
  defaultLowOutputLatency: number;
  defaultHighInputLatency: number;
  defaultHighOutputLatency: number;
  defaultSampleRate: number;
  isLoopbackDevice: boolean;
}
