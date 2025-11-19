from typing import Annotated

from pydantic import BaseModel, Field

COLLECTION_NAME = "users"


class UserProfile(BaseModel):
    username: Annotated[
        str,
        Field(description="The username of the user"),
    ] = "John Doe"
    profile_data: Annotated[
        str,
        Field(description="The profile data of the user"),
    ] = "My name is John Doe."
