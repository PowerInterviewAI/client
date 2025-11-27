export interface UserProfile {
  photo: string;
  username: string;
  profile_data: string;
}

export enum Language {
  ENGLISH = 'en',
}

export interface Config {
  profile: UserProfile;
  language: Language;

  // Transcription options
  audio_input_device_name: string;
  asr_model_name: string;

  // Audio control options
  enable_audio_control: boolean;
  audio_control_device_name: string;
  audio_delay_ms: number;

  // Video control options
  enable_video_control: boolean;
  camera_device_name: string;
  video_width: number;
  video_height: number;
  enable_face_swap: boolean;
  enable_face_enhance: boolean;
}
