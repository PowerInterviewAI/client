import aiohttp
from fastapi.responses import JSONResponse

from engine.cfg.client import config as cfg_client
from engine.schemas.webrtc import WebRTCOfferRequest


class WebRTCService:
    @classmethod
    async def process_offer(cls, request: WebRTCOfferRequest) -> JSONResponse:
        async with (
            aiohttp.ClientSession() as session,
            session.post(
                cfg_client.BACKEND_WEBRTC_OFFER_URL,
                json=request.model_dump(),
            ) as resp,
        ):
            resp.raise_for_status()

            return JSONResponse(content=await resp.json())
