from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field

from engine.schemas.transcript import Transcript


class SuggestionState(StrEnum):
    IDLE = "idle"
    PENDING = "pending"
    LOADING = "loading"
    SUCCESS = "success"
    STOPPED = "stopped"
    ERROR = "error"


class ReplySuggestion(BaseModel):
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


class GenerateReplySuggestionRequest(BaseModel):
    username: Annotated[
        str,
        Field(description="The username of the user"),
    ]
    profile_data: Annotated[
        str,
        Field(description="The profile data of the user"),
    ]
    job_description: Annotated[
        str,
        Field(description="The job description the user is targeting"),
    ]
    transcripts: Annotated[
        list[Transcript],
        Field(description="The transcripts of the user"),
    ]


class CodeSuggestion(BaseModel):
    timestamp: Annotated[
        int,
        Field(description="The Unix timestamp of the code suggestion"),
    ]
    image_count: Annotated[
        int,
        Field(description="The number of screenshot thumbnail images associated with the suggestion"),
    ]
    user_prompt: Annotated[
        str,
        Field(description="The user's prompt for code suggestion"),
    ]
    suggestion_content: Annotated[
        str,
        Field(description="The suggested code content"),
    ]
    state: Annotated[
        SuggestionState,
        Field(description="The state of the code suggestion"),
    ]


class GenerateCodeSuggestionRequest(BaseModel):
    user_prompt: Annotated[
        str,
        Field(description="The user's prompt for code suggestion"),
    ]
    images_b64: Annotated[
        list[str],
        Field(description="The list of screenshot images in base64 format"),
    ]
