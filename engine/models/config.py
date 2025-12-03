from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field

from engine.models.user_profile import UserProfile


class Language(StrEnum):
    EN = "en"


class Config(BaseModel):
    profile: Annotated[
        UserProfile,
        Field(description="The user profile"),
    ] = UserProfile()
    language: Annotated[
        Language,
        Field(description="The language"),
    ] = Language.EN

    # Transcript options
    audio_input_device_name: Annotated[
        str,
        Field(description="The audio input device name"),
    ] = ""

    # Audio control options
    enable_audio_control: Annotated[
        bool,
        Field(description="Whether audio control is enabled"),
    ] = False
    audio_control_device_name: Annotated[
        str,
        Field(description="The audio control device name"),
    ] = ""
    audio_delay_ms: Annotated[
        int,
        Field(description="The audio delay in milliseconds"),
    ] = 0

    # Video control options
    enable_video_control: Annotated[
        bool,
        Field(description="Whether video control is enabled"),
    ] = False
    camera_device_name: Annotated[
        str,
        Field(description="The camera device name"),
    ] = ""
    video_width: Annotated[
        int,
        Field(description="The video resolution width"),
    ] = 1280
    video_height: Annotated[
        int,
        Field(description="The video resolution height"),
    ] = 720
    enable_face_swap: Annotated[
        bool,
        Field(description="Whether face swap is enabled"),
    ] = False
    enable_face_enhance: Annotated[
        bool,
        Field(description="Whether face enhancement is enabled"),
    ] = False


class ConfigUpdate(BaseModel):
    profile: UserProfile | None = None
    language: Language | None = None

    # Transcript options
    audio_input_device_name: str | None = None

    # Audio control options
    enable_audio_control: bool | None = None
    audio_control_device_name: str | None = None
    audio_delay_ms: int | None = None

    # Video control options
    enable_video_control: bool | None = None
    camera_device_name: str | None = None
    video_width: int | None = None
    video_height: int | None = None
    enable_face_swap: bool | None = None
    enable_face_enhance: bool | None = None
