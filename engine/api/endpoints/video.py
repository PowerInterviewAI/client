import contextlib
import queue
import threading

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket
from fastapi.responses import JSONResponse
from loguru import logger

from engine.api.error_handler import RouteErrorHandler
from engine.app import the_app
from engine.schemas.webrtc import WebRTCOfferRequest
from engine.services.webrtc_service import WebRTCService

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["Video Control Endpoints"],
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
            # enqueue raw JPEG bytes for background decoding/processing
            if not _enqueue_chunk(data):
                logger.debug("Dropping incoming frame because queue is full")

        except Exception as ex:
            logger.warning(f"Failed to process frame: {ex}")
            break


# ---------------------------------------------------------------------------
# Background worker: decode bytes -> BGR frame -> forward to app
# ---------------------------------------------------------------------------
CHUNK_QUEUE_MAXSIZE = 4
_chunk_queue: "queue.Queue[bytes]" = queue.Queue(maxsize=CHUNK_QUEUE_MAXSIZE)
_chunk_worker_stop = threading.Event()
_chunk_worker_thread: threading.Thread | None = None


def _chunk_worker() -> None:
    logger.debug("video endpoint chunk worker started")
    while not _chunk_worker_stop.is_set():
        try:
            data = _chunk_queue.get(timeout=0.5)
        except queue.Empty:
            continue

        try:
            # decode JPEG bytes to BGR
            arr = np.frombuffer(data, dtype=np.uint8)
            frame_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame_bgr is None:
                logger.warning("Failed to decode queued frame")
                continue

            # forward to application (thread-safe)
            the_app.on_virtual_camera_frame(frame_bgr)
        except Exception as ex:
            logger.warning(f"Failed to handle queued chunk: {ex}")
        finally:
            # drop reference to data to free memory earlier
            with contextlib.suppress(Exception):
                del data


def _start_chunk_worker() -> None:
    global _chunk_worker_thread  # noqa: PLW0603
    if _chunk_worker_thread and _chunk_worker_thread.is_alive():
        return
    _chunk_worker_stop.clear()
    _chunk_worker_thread = threading.Thread(target=_chunk_worker, daemon=True)
    _chunk_worker_thread.start()


def _stop_chunk_worker() -> None:
    _chunk_worker_stop.set()
    with contextlib.suppress(Exception):
        if _chunk_worker_thread and _chunk_worker_thread.is_alive():
            _chunk_worker_thread.join(timeout=1.0)


def _enqueue_chunk(data: bytes) -> bool:
    """Try to enqueue raw bytes. Return True if enqueued, False if dropped."""
    try:
        _chunk_queue.put_nowait(data)
        return True  # noqa: TRY300
    except queue.Full:
        return False


# Start worker on module import so websocket ingestion is ready
with contextlib.suppress(Exception):
    _start_chunk_worker()
