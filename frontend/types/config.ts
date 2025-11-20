export interface UserProfile {
    username: string;
    profileData: string;
}

export enum Language {
    ENGLISH = 'en',
}

export interface Config {
    profile: UserProfile;
    audioInputDevice: number;
    audioOutputDevice: number;
    language: Language;
}