import contextlib
import threading
from typing import Any

import cv2
import numpy as np
import pyvirtualcam
from loguru import logger

from backend.models.config import Config


class VirtualCameraService:
    """
    A thread-backed virtual camera service that sends frames to a pyvirtualcam.Camera.

    Usage:
        svc = VirtualCameraService(width=640, height=480, fps=30)
        svc.start()
        svc.set_frame(frame)  # numpy BGR frame
        svc.config(width=1280, height=720, fps=25)
        svc.stop()
    """

    def __init__(
        self,
        width: int = 1280,
        height: int = 720,
        fps: int = 30,
    ) -> None:
        self.width = int(width)
        self.height = int(height)
        self.fps = int(fps)

        self._lock = threading.Lock()
        self._cond = threading.Condition(self._lock)
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

        # stored frame in BGR format (as commonly used by OpenCV)
        self._frame: np.ndarray[Any, Any] | None = np.zeros((self.height, self.width, 3), dtype=np.uint8)

    # --- Worker ---------------------------------------------------------
    def _worker(self) -> None:
        """
        Worker thread: creates a pyvirtualcam.Camera and continuously sends frames.
        The worker will restart the camera if config changes (width/height/fps).
        """
        logger.debug("VirtualCameraService worker started")
        current_width = self.width
        current_height = self.height
        current_fps = self.fps

        while not self._stop_event.is_set():
            try:
                logger.debug("Starting virtual camera: {}x{} @ {}fps", current_width, current_height, current_fps)
                vcam = pyvirtualcam.Camera(width=current_width, height=current_height, fps=current_fps)
            except Exception as ex:
                logger.warning("Failed to start virtual camera: {}", ex)
                # Wait a bit before retrying to avoid tight loop
                if self._stop_event.wait(timeout=1.0):
                    break
                # refresh config under lock
                with self._lock:
                    current_width = self.width
                    current_height = self.height
                    current_fps = self.fps
                continue

            try:
                # Main send loop for the opened camera
                frame_interval = 1.0 / max(1, current_fps)
                while not self._stop_event.is_set():
                    with self._cond:
                        # If config changed, break to recreate camera with new settings
                        if (
                            (current_width != self.width)
                            or (current_height != self.height)
                            or (current_fps != self.fps)
                        ):
                            logger.debug("Camera config changed, restarting camera")
                            break

                        # Wait until a new frame is available or timeout for next frame
                        # This makes the loop responsive to set_frame() and config() calls
                        self._cond.wait(timeout=frame_interval)

                        # Copy frame under lock to avoid races
                        frame = None if self._frame is None else self._frame.copy()

                    if frame is None:
                        # No frame available; send a black frame of the camera size
                        frame = np.zeros((current_height, current_width, 3), dtype=np.uint8)

                    try:
                        # Ensure frame has correct shape and dtype
                        if frame.dtype != np.uint8:
                            frame = frame.astype(np.uint8)

                        if frame.ndim == 2:  # noqa: PLR2004
                            # single channel -> convert to 3-channel
                            frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)

                        if frame.shape[:2] != (current_height, current_width):
                            frame = cv2.resize(frame, (current_width, current_height))

                        # Convert BGR (OpenCV) to RGB for pyvirtualcam
                        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        vcam.send(rgb)
                        vcam.sleep_until_next_frame()
                    except Exception as ex:
                        logger.warning("Failed to send frame: {}", ex)
                        # small backoff to avoid tight error loop
                        if self._stop_event.wait(timeout=0.1):
                            break

                # close camera and refresh local config snapshot
                with contextlib.suppress(Exception):
                    vcam.close()

                with self._lock:
                    current_width = self.width
                    current_height = self.height
                    current_fps = self.fps

            except Exception as ex:
                logger.exception("Unexpected error in virtual camera loop: {}", ex)
                # ensure camera closed on unexpected error
                with contextlib.suppress(Exception):
                    vcam.close()

                # brief pause before retrying
                if self._stop_event.wait(timeout=0.5):
                    break

        logger.debug("VirtualCameraService worker exiting")

    # --- Public API ----------------------------------------------------
    def start(self) -> None:
        """Start the background worker. Idempotent."""
        with self._lock:
            if self._thread and self._thread.is_alive():
                logger.debug("VirtualCameraService already running")
                return
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._worker, daemon=True)
            self._thread.start()
            logger.debug("VirtualCameraService started")

    def stop(self, join_timeout: float = 2.0) -> None:
        """Stop the background worker and wait up to join_timeout seconds."""
        self._stop_event.set()
        with self._cond:
            self._cond.notify_all()
        thread = None
        with self._lock:
            thread = self._thread
        if thread and thread.is_alive():
            thread.join(timeout=join_timeout)
            logger.debug("VirtualCameraService stopped")

    def set_parameters(self, width: int, height: int, fps: int) -> None:
        """Update camera configuration. Worker will restart camera with new settings."""
        with self._cond:
            self.width = int(width)
            self.height = int(height)
            self.fps = int(fps)
            self._cond.notify_all()
        logger.debug("VirtualCameraService config updated: {}x{} @ {}fps", self.width, self.height, self.fps)

    def update_parameters_from_config(self, config: Config) -> None:
        """Update camera configuration. Worker will restart camera with new settings."""
        with self._cond:
            self.width = int(config.video_width)
            self.height = int(config.video_height)
            self._cond.notify_all()
        logger.debug("VirtualCameraService config updated: {}x{} @ {}fps", self.width, self.height, self.fps)

    def set_frame(self, frame: np.ndarray[Any, Any]) -> None:
        """
        Set the latest frame to be sent to the virtual camera.
        Expects a numpy array in BGR color order (OpenCV convention).
        """
        if not isinstance(frame, np.ndarray):
            msg = "frame must be a numpy.ndarray"
            raise TypeError(msg)

        if frame.ndim not in (2, 3):
            msg = "frame must be 2D (gray) or 3D (color) numpy array"
            raise ValueError(msg)

        with self._cond:
            # store a copy to avoid external mutation
            self._frame = frame.copy()
            self._cond.notify_all()

    @property
    def is_running(self) -> bool:
        with self._lock:
            return bool(self._thread and self._thread.is_alive())


# module-level default instance
VIRTUAL_CAMERA_SERVICE = VirtualCameraService()
