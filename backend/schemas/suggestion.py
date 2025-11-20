from typing import Annotated

from pydantic import BaseModel, Field


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


class SuggestionBatch(BaseModel):
    timestamp: Annotated[
        int,
        Field(description="The Unix timestamp of the suggestions"),
    ]
    last_question: Annotated[
        str,
        Field(description="The last question"),
    ]
    suggestions: Annotated[
        list[SuggestionRecord],
        Field(description="The list of suggestions"),
    ]
