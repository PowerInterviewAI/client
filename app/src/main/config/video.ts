/**
 * Video/Camera Configuration
 */

export interface VideoConfig {
  enabled: boolean;
  resolution: { width: number; height: number };
  frameRate: number;
  codec: string;
  virtualCamera: boolean;
}

export const videoConfig: VideoConfig = {
  enabled: false,
  resolution: { width: 1280, height: 720 },
  frameRate: 30,
  codec: 'vp8',
  virtualCamera: false,
};
