import { PyAudioDevice } from "./audioDevice"
import { SuggestionBatch, SuggestionState } from "./suggestion"
import { Transcript } from "./transcript"

export enum RunningState {
    IDLE = "idle",
    STARTING = "starting",
    RUNNING = "running",
    STOPPING = "stopping",
    STOPPED = "stopped",
}

export interface AppState {
    audio_input_devices: PyAudioDevice[]
    audio_output_devices: PyAudioDevice[]
    transcripts: Transcript[]
    running_state: RunningState
    suggestion_state: SuggestionState
    suggestions: SuggestionBatch[]
}