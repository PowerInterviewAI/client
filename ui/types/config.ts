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
  audio_input_device: number;
  asr_model: string;

  // Audio control options
  enable_audio_control: boolean;
  audio_control_device: number;
  audio_delay: number;

  // Video control options
  enable_video_control: boolean;
  camera_device: string;
  video_width: number;
  video_height: number;
  enable_face_swap: boolean;
  enable_face_enhance: boolean;
}
