from enum import StrEnum
from typing import Annotated

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
        SuggestionBatch,
        Field(description="The suggestions"),
    ]
