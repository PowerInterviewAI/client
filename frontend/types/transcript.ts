export enum Speaker {
    YOU = "You",
    INTERVIEWER = "Interviewer",
}

export interface Transcript {
    timestamp: number;
    text: string;
    speaker: Speaker;
}