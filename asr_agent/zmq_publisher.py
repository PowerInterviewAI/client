"""
ZeroMQ Publisher for ASR transcripts.
"""

import contextlib
import time
from typing import Any

import zmq
from loguru import logger

# ZeroMQ configuration constants
RECONNECT_DELAY_SECONDS = 1.0
MAX_RECONNECT_ATTEMPTS = 0  # 0 = infinite, retries forever


class ZMQPublisher:
    """Publishes ASR transcripts to ZeroMQ."""

    def __init__(self, port: int) -> None:
        self.port = port
        self.context: zmq.Context[Any] | None = None
        self.socket: zmq.Socket[Any] | None = None
        self.connected = False
        self.published_count = 0
        self.failed_count = 0
        self.last_reconnect_attempt = 0.0

    def connect(self) -> bool:
        """Initialize ZeroMQ publisher."""
        try:
            if self.context is None:
                self.context = zmq.Context()

            if self.socket:
                self.socket.close()

            logger.info(f"Binding to ZeroMQ port {self.port}...")
            self.socket = self.context.socket(zmq.PUB)
            self.socket.bind(f"tcp://*:{self.port}")

            self.connected = True
            logger.info("ZeroMQ publisher initialized")
            return True  # noqa: TRY300

        except Exception as e:
            logger.exception(f"Failed to initialize ZeroMQ: {e}")
            self.connected = False
            return False

    def disconnect(self) -> None:
        """Clean up ZeroMQ resources."""
        if self.socket:
            try:
                self.socket.close()
            except Exception as e:
                logger.debug(f"Error closing ZeroMQ socket: {e}")
            self.socket = None

        if self.context:
            try:
                self.context.term()
            except Exception as e:
                logger.debug(f"Error terminating ZeroMQ context: {e}")
            self.context = None

        self.connected = False

    def publish(self, text: str, is_final: bool = False) -> None:  # noqa: FBT001, FBT002
        """Publish transcript to ZeroMQ with automatic reconnection on failure."""
        # Try to reconnect if not connected
        if (not self.connected or self.socket is None) and not self._attempt_reconnect():
            return

        try:
            message = f"{'FINAL' if is_final else 'PARTIAL'}: {text}"
            self.socket.send_string(message, flags=zmq.NOBLOCK)  # type: ignore  # noqa: PGH003
            self.published_count += 1
            logger.info(f"Published: {message}")
        except zmq.ZMQError as e:
            self.failed_count += 1
            logger.error(f"Failed to publish (ZMQ error {e.errno}): {e}")
            self.connected = False

            # Try immediate reconnection for recoverable errors
            if e.errno in (zmq.EAGAIN, zmq.ETERM, zmq.ENOTSOCK):
                self._attempt_reconnect()
        except Exception as e:
            self.failed_count += 1
            logger.error(f"Failed to publish: {e}")
            self.connected = False

    def _attempt_reconnect(self) -> bool:
        """Attempt to reconnect with throttling."""
        current_time = time.time()

        # Throttle reconnection attempts
        if current_time - self.last_reconnect_attempt < RECONNECT_DELAY_SECONDS:
            return False

        self.last_reconnect_attempt = current_time
        logger.info("Attempting to reconnect ZeroMQ publisher...")

        # Clean up existing socket
        if self.socket:
            with contextlib.suppress(Exception):
                self.socket.close()
            self.socket = None

        # Try to reconnect (infinite retries if MAX_RECONNECT_ATTEMPTS = 0)
        max_attempts = MAX_RECONNECT_ATTEMPTS if MAX_RECONNECT_ATTEMPTS > 0 else 3
        for attempt in range(max_attempts):
            if self.connect():
                logger.info(f"ZeroMQ reconnected on attempt {attempt + 1}")
                return True

            if attempt < max_attempts - 1:
                time.sleep(RECONNECT_DELAY_SECONDS)

        if MAX_RECONNECT_ATTEMPTS == 0:
            # For infinite mode, just warn and try again later
            logger.warning("ZeroMQ reconnection failed, will retry on next publish")
        else:
            logger.error(f"Failed to reconnect after {MAX_RECONNECT_ATTEMPTS} attempts")

        return False
