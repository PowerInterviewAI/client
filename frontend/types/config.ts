export interface UserProfile {
    username: string;
    profile_data: string;
}

export enum Language {
    ENGLISH = 'en',
}

export interface Config {
    profile: UserProfile;
    audio_input_device: number;
    language: Language;

    // Audio control options
    enable_audio_control: boolean;
    audio_control_device: number;
    audio_delay: number;

    // Video control options
    enable_video_control: boolean;
    camera_device: number;
    video_width: number;
    video_height: number;
    enable_face_swap: boolean;
    enable_face_enhance: boolean;
}