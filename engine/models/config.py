from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, Field

from engine.models.interview_conf import InterviewConf


class Language(StrEnum):
    EN = "en"


class Config(BaseModel):
    session_token: Annotated[
        str,
        Field(description="The session token"),
    ] = ""

    # General options
    interview_conf: Annotated[
        InterviewConf,
        Field(description="The user profile"),
    ] = InterviewConf()
    language: Annotated[
        Language,
        Field(description="The language"),
    ] = Language.EN

    # Audio options
    audio_input_device_name: Annotated[
        str,
        Field(description="The audio input device name"),
    ] = ""

    # Video options
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
    audio_delay_ms: Annotated[
        int,
        Field(description="The audio delay in milliseconds"),
    ] = 300


class ConfigUpdate(BaseModel):
    session_token: str | None = None

    # General options
    interview_conf: InterviewConf | None = None
    language: Language | None = None

    # Audio options
    audio_input_device_name: str | None = None

    # Video options
    enable_video_control: bool | None = None
    camera_device_name: str | None = None
    video_width: int | None = None
    video_height: int | None = None
    enable_face_swap: bool | None = None
    enable_face_enhance: bool | None = None
    audio_delay_ms: int | None = None
