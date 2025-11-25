from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field


class Speaker(StrEnum):
    SELF = "self"
    OTHER = "other"


class Transcript(BaseModel):
    timestamp: Annotated[
        int,
        Field(description="The Unix timestamp of the text"),
    ]
    text: Annotated[
        str,
        Field(description="The transcribed text"),
    ]
    speaker: Annotated[
        Speaker,
        Field(description="The speaker of the text"),
    ]
