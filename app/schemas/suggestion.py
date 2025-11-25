from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field

from app.schemas.transcript import Transcript


class SuggestionState(StrEnum):
    IDLE = "idle"
    PENDING = "pending"
    LOADING = "loading"
    SUCCESS = "success"
    STOPPED = "stopped"
    ERROR = "error"


class Suggestion(BaseModel):
    timestamp: Annotated[
        int,
        Field(description="The Unix timestamp of the suggestions"),
    ]
    last_question: Annotated[
        str,
        Field(description="The last question"),
    ]
    answer: Annotated[
        str,
        Field(description="The suggested answer"),
    ]
    state: Annotated[
        SuggestionState,
        Field(description="The state of the suggestion"),
    ]


class GenerateSuggestionRequest(BaseModel):
    username: Annotated[
        str,
        Field(description="The username of the user"),
    ]
    profile_data: Annotated[
        str,
        Field(description="The profile data of the user"),
    ]
    transcripts: Annotated[
        list[Transcript],
        Field(description="The transcripts of the user"),
    ]
