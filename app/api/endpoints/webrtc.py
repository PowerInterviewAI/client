import cv2
import numpy as np
from fastapi import APIRouter, WebSocket
from fastapi.responses import JSONResponse
from loguru import logger

from app.api.error_handler import RouteErrorHandler
from app.schemas.webrtc import WebRTCOfferRequest
from app.services.virtual_camera import VIRTUAL_CAMERA_SERVICE
from app.services.webrtc_service import WebRTCService

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["WebRTC Endpoints"],
)


@router.post("/offer")
def offer(request: WebRTCOfferRequest) -> JSONResponse:
    return WebRTCService.process_offer(request=request)


@router.websocket("/frames")
async def frames(ws: WebSocket) -> None:
    await ws.accept()
    while True:
        try:
            data = await ws.receive_bytes()

            # Decode JPEG to BGR
            arr = np.frombuffer(data, dtype=np.uint8)
            frame_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame_bgr is None:
                # Skip bad frames
                continue

            VIRTUAL_CAMERA_SERVICE.set_frame(frame_bgr)
        except Exception as ex:
            logger.warning(f"Failed to process frame: {ex}")
