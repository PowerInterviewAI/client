from typing import Annotated

from pydantic import BaseModel, EmailStr, Field

from engine.schemas.device_info import DeviceInfo


class AuthRequest(BaseModel):
    email: Annotated[
        EmailStr,
        Field(description="User email"),
    ]
    password: Annotated[
        str,
        Field(description="User password"),
    ]


class LoginRequestBackend(BaseModel):
    email: Annotated[
        str,
        Field(description="User email"),
    ]
    password: Annotated[
        str,
        Field(description="User password"),
    ]
    device_info: Annotated[
        DeviceInfo,
        Field(description="Device information"),
    ]
