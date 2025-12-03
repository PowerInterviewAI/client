from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field


class ASRResultType(StrEnum):
    ERROR = "error"
    FINAL = "final"
    PARTIAL = "partial"


class ASRResult(BaseModel):
    type: Annotated[
        ASRResultType,
        Field(description="The type of the ASR result"),
    ]
    content: Annotated[
        str,
        Field(description="The transcribe ASR content"),
    ]
