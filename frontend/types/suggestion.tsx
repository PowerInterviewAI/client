export enum SuggestionState {
    IDLE = "idle",
    LOADING = "loading",
    SUCCESS = "success",
    ERROR = "error",
}

export interface SuggestionRecord {
    score: number
    purpose: string
    content: string
}

export interface Suggestion {
    timestamp: number
    last_question: string
    records: SuggestionRecord[]
}