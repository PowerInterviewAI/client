from typing import Annotated

from pydantic import BaseModel, Field


class GenerateCodeSuggestionRequest(BaseModel):
    user_prompt: Annotated[
        str,
        Field(description="The user's prompt for code suggestion"),
    ]
    screenshot_bytes: Annotated[
        bytes,
        Field(description="The screenshot image in bytes"),
    ]
