from typing import Annotated

from pydantic import BaseModel, Field

COLLECTION_NAME = "users"


class UserProfile(BaseModel):
    username: Annotated[
        str,
        Field(description="The username of the user"),
    ] = "John Doe"
    resume: Annotated[
        str,
        Field(description="The resume content of the user"),
    ] = "My name is John Doe."
