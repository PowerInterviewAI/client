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
    """The app state."""

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
    is_backend_live: Annotated[
        bool,
        Field(description="Whether the backend is live"),
    ]
