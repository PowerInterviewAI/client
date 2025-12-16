from typing import Annotated

from pydantic import BaseModel, Field


class DeviceInfo(BaseModel):
    """Information about a device."""

    device_id: Annotated[
        str,
        Field(description="Unique identifier for the device"),
    ]
    os_name: Annotated[
        str,
        Field(description="Operating system name"),
    ]
    arch: Annotated[
        str,
        Field(description="System architecture"),
    ]
    platform: Annotated[
        str,
        Field(description="Platform information"),
    ]
