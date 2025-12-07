from typing import Annotated

from pydantic import BaseModel, Field

from engine.schemas.transcript import Transcript


class GenerateSummarizeRequest(BaseModel):
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
