from typing import Annotated

from pydantic import BaseModel, Field


class WebRTCOptions(BaseModel):
    photo: Annotated[
        str,
        Field(description="Base64 encoded photo"),
    ]
    enhance_face: Annotated[
        bool,
        Field(description="Whether to enhance face"),
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
