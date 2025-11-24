from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.api.error_handler import RouteErrorHandler
from backend.schemas.webrtc import WebRTCOfferRequest
from backend.services.webrtc_service import WebRTCService

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["WebRTC Endpoints"],
)


@router.post("/offer")
def offer(request: WebRTCOfferRequest) -> JSONResponse:
    return WebRTCService.process_offer(request=request)
