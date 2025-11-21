export enum SuggestionState {
    IDLE = "idle",
    PENDING = "pending",
    LOADING = "loading",
    SUCCESS = "success",
    ERROR = "error",
}


export interface Suggestion {
    timestamp: number
    last_question: string
    answer: string
}