from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field

from backend.schemas.transcript import Transcript


class SuggestionState(StrEnum):
    IDLE = "idle"
    LOADING = "loading"
    SUCCESS = "success"
    ERROR = "error"


class SuggestionRecord(BaseModel):
    score: Annotated[
        int,
        Field(
            description="The score of the suggestion",
            ge=0,
            le=100,
        ),
    ]
    purpose: Annotated[
        str,
        Field(description="The purpose of the suggestion"),
    ]
    content: Annotated[
        str,
        Field(description="The content of the suggestion"),
    ]


class Suggestion(BaseModel):
    timestamp: Annotated[
        int,
        Field(description="The Unix timestamp of the suggestions"),
    ]
    last_question: Annotated[
        str,
        Field(description="The last question"),
    ]
    records: Annotated[
        list[SuggestionRecord],
        Field(description="The list of suggestion records"),
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
