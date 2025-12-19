from aiohttp import ClientSession
from fastapi.responses import JSONResponse

from engine.api.error_handler import raise_for_status
from engine.cfg.client import config as cfg_client
from engine.schemas.webrtc import WebRTCOfferRequest


class WebRTCService:
    @classmethod
    async def process_offer(cls, client_session: ClientSession, request: WebRTCOfferRequest) -> JSONResponse:
        async with client_session.post(
            cfg_client.BACKEND_WEBRTC_OFFER_URL,
            json=request.model_dump(),
        ) as resp:
            await raise_for_status(resp)

            return JSONResponse(content=await resp.json())
