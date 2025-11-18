export interface UserProfile {
    username: string;
    resume: string;
}

export enum Language {
    ENGLISH = 'en',
}

export interface AppState {
    profile: UserProfile;
    audio_input_device: number;
    audio_output_device: number;
    language: Language;
}