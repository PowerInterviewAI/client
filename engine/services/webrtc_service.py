from fastapi.responses import JSONResponse

from engine.api.error_handler import raise_for_status
from engine.cfg.client import config as cfg_client
from engine.schemas.webrtc import WebRTCOfferRequest
from engine.services.web_client import WebClient


class WebRTCService:
    @classmethod
    def process_offer(cls, request: WebRTCOfferRequest) -> JSONResponse:
        resp = WebClient.post(
            url=cfg_client.BACKEND_WEBRTC_OFFER_URL,
            json=request.model_dump(),
        )
        raise_for_status(resp)

        return JSONResponse(content=resp.json())
