import requests
from fastapi.responses import JSONResponse

from app.cfg.client import config as cfg_client
from app.schemas.webrtc import WebRTCOfferRequest


class WebRTCService:
    @classmethod
    def process_offer(cls, request: WebRTCOfferRequest) -> JSONResponse:
        response = requests.post(
            cfg_client.BACKEND_WEBRTC_OFFER_URL,
            json=request.model_dump(),
            timeout=cfg_client.HTTP_TIMEOUT,
        )
        response.raise_for_status()

        return JSONResponse(content=response.json())
