export interface InterviewConf {
  photo: string;
  username: string;
  profile_data: string;
  job_description: string;
}

export enum Language {
  ENGLISH = 'en',
}

export interface Config {
  interview_conf: InterviewConf;
  language: Language;

  // Transcription options
  audio_input_device_name: string;

  // Video control options
  enable_video_control: boolean;
  camera_device_name: string;
  video_width: number;
  video_height: number;
  enable_face_swap: boolean;
  enable_face_enhance: boolean;
  audio_delay_ms: number;
}
