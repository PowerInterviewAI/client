from typing import Annotated

from pydantic import BaseModel, Field

COLLECTION_NAME = "users"


class InterviewConf(BaseModel):
    photo: Annotated[
        str,
        Field(description="The photo of the user"),
    ] = ""
    username: Annotated[
        str,
        Field(description="The username of the user"),
    ] = "John Doe"
    profile_data: Annotated[
        str,
        Field(description="The profile data of the user"),
    ] = "My name is John Doe."
    job_description: Annotated[
        str,
        Field(description="The job description the user is targeting"),
    ] = "Software Engineer"
