from enum import StrEnum
from typing import Annotated, Any

from pydantic import BaseModel, Field

from backend.schemas.suggestion import SuggestionBatch, SuggestionState
from backend.schemas.transcript import Transcript


class RunningState(StrEnum):
    IDLE = "idle"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"


class AppState(BaseModel):
    audio_input_devices: Annotated[
        list[dict[str, Any]],
        Field(description="The list of audio input devices"),
    ]
    audio_output_devices: Annotated[
        list[dict[str, Any]],
        Field(description="The list of audio output devices"),
    ]
    transcripts: Annotated[
        list[Transcript],
        Field(description="The list of transcripts"),
    ]
    running_state: Annotated[
        RunningState,
        Field(description="The running state"),
    ]
    suggestion_state: Annotated[
        SuggestionState,
        Field(description="The suggestion state"),
    ]
    suggestions: Annotated[
        list[SuggestionBatch],
        Field(description="The suggestions"),
    ]
