import { PyAudioDevice } from "./audioDevice"
import { RunningState } from "./runningState"
import { SuggestionBatch, SuggestionState } from "./suggestion"
import { Transcript } from "./transcript"

export interface AppState {
    audioInputDevices: PyAudioDevice[]
    audioOutputDevices: PyAudioDevice[]
    transcripts: Transcript[]
    runningState: RunningState
    suggestionState: SuggestionState
    suggestions: SuggestionBatch[]
}