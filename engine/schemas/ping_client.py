from typing import Annotated

from pydantic import BaseModel, Field

from engine.schemas.device_info import DeviceInfo


class PingClientRequest(BaseModel):
    """Request schema for client ping to backend."""

    device_info: Annotated[
        DeviceInfo,
        Field(description="Information about the client device"),
    ]
    is_gpu_alive: Annotated[
        bool,
        Field(description="Whether the GPU server is alive"),
    ]
    is_assistant_running: Annotated[
        bool,
        Field(description="Whether the assistant is running"),
    ]
