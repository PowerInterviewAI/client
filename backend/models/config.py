from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field

from backend.models.user_profile import UserProfile


class Language(StrEnum):
    EN = "en"


class Config(BaseModel):
    profile: Annotated[
        UserProfile,
        Field(description="The user profile"),
    ] = UserProfile()
    audio_input_device: Annotated[
        int,
        Field(description="The audio input device index"),
    ] = 0
    audio_output_device: Annotated[
        int,
        Field(description="The audio output device index"),
    ] = 0
    language: Annotated[
        Language,
        Field(description="The language"),
    ] = Language.EN


class ConfigUpdate(BaseModel):
    profile: UserProfile | None = None
    audio_input_device: int | None = None
    audio_output_device: int | None = None
    language: Language | None = None
