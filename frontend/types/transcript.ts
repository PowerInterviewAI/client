export enum Speaker {
    SELF = "self",
    OTHER = "other",
}

export interface Transcript {
    timestamp: number;
    text: string;
    speaker: Speaker;
}