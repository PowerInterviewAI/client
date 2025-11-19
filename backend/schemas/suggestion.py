from typing import Annotated

from pydantic import BaseModel, Field


class Suggestion(BaseModel):
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
