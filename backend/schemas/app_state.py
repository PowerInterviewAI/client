from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field

from backend.schemas.suggestion import Suggestion
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
    suggestions: Annotated[
        list[Suggestion],
        Field(description="The list of suggestions"),
    ]
