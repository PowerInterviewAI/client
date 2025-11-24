from typing import Annotated

from pydantic import BaseModel, Field


class WebRTCOptions(BaseModel):
    photo: Annotated[
        str,
        Field(description="Base64 encoded photo"),
    ]
    swap_face: Annotated[
        bool,
        Field(description="Swap face flag"),
    ]
    enhance_face: Annotated[
        bool,
        Field(description="Enhance face flag"),
    ]


class WebRTCOfferRequest(BaseModel):
    sdp: Annotated[
        str,
        Field(description="SDP offer"),
    ]
    type: Annotated[
        str,
        Field(description="Offer type"),
    ]
    options: Annotated[
        WebRTCOptions,
        Field(description="WebRTC options"),
    ]
