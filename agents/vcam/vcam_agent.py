"""
Virtual Camera Agent that receives frames via ZeroMQ and outputs to a virtual camera.
"""

import queue
import threading
import time
from datetime import datetime
from typing import Any

import cv2
import numpy as np
import pyvirtualcam
import zmq
from loguru import logger

show_datetime: bool = True


class VCamAgent:
    """Virtual Camera Agent that receives frames via ZeroMQ."""

    def __init__(
        self,
        width: int = 1280,
        height: int = 720,
        fps: int = 30,
        zmq_port: int = 50001,
        show_datetime: bool = True,  # noqa: FBT001, FBT002
        stats_interval: float = 10.0,
    ) -> None:
        self.width = width
        self.height = height
        self.fps = fps
        self.zmq_port = zmq_port
        self.show_datetime = show_datetime
        self.stats_interval = stats_interval

        # Frame queue with max size to prevent memory overflow
        self.frame_queue: queue.Queue[np.ndarray[Any, Any]] = queue.Queue(maxsize=10)
        self.last_frame: np.ndarray[Any, Any] | None = None

        # Control flags
        self.running = False
        self.zmq_connected = False

        # Components
        self.vcam: pyvirtualcam.Camera | None = None
        self.zmq_context: zmq.Context[Any] | None = None
        self.zmq_socket: zmq.Socket[Any] | None = None

        # Threads
        self.receiver_thread: threading.Thread | None = None
        self.writer_thread: threading.Thread | None = None
        # Statistics
        self.frames_received = 0
        self.frames_dropped = 0
        self.frames_written = 0
        self.last_received_count = 0
        self.last_written_count = 0

    def create_black_frame(self) -> np.ndarray[Any, Any]:
        """Create a black frame with optional datetime overlay."""
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)

        if self.show_datetime:
            # Add datetime text
            timestamp = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S")
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 1.5
            thickness = 2
            color = (255, 255, 255)

            # Get text size for centering
            text_size = cv2.getTextSize(timestamp, font, font_scale, thickness)[0]
            text_x = (self.width - text_size[0]) // 2
            text_y = (self.height + text_size[1]) // 2

            cv2.putText(
                frame,
                timestamp,
                (text_x, text_y),
                font,
                font_scale,
                color,
                thickness,
                cv2.LINE_AA,
            )

        return frame

    def init_virtual_camera(self) -> bool:
        """Initialize virtual camera."""
        try:
            logger.info(f"Initializing virtual camera: {self.width}x{self.height} @ {self.fps}fps")
            self.vcam = pyvirtualcam.Camera(
                width=self.width,
                height=self.height,
                fps=self.fps,
                fmt=pyvirtualcam.PixelFormat.RGB,
            )
            logger.info(f"Virtual camera initialized: {self.vcam.device}")
        except Exception as e:
            logger.error(f"Error initializing virtual camera: {e}")
            return False
        else:
            return True

    def init_zmq(self) -> bool:
        """Initialize ZeroMQ connection."""
        try:
            if self.zmq_context is None:
                self.zmq_context = zmq.Context()

            if self.zmq_socket:
                self.zmq_socket.close()

            logger.info(f"Connecting to ZeroMQ port {self.zmq_port}...")
            # Use a PULL socket to receive frames from the application's Push socket.
            # Push (app) -> Pull (agent) is the correct pipeline pattern for one-to-one frame delivery.
            self.zmq_socket = self.zmq_context.socket(zmq.PULL)
            # Set receive timeout to avoid blocking indefinitely
            self.zmq_socket.setsockopt(zmq.RCVTIMEO, 1000)  # 1 second timeout
            self.zmq_socket.connect(f"tcp://localhost:{self.zmq_port}")

            self.zmq_connected = True
            logger.info("ZeroMQ connected")
        except Exception as e:
            logger.error(f"Error connecting to ZeroMQ: {e}")
            self.zmq_connected = False
            return False
        else:
            return True

    def receive_frames(self) -> None:
        """Receiver thread: Read frames from ZeroMQ and enqueue them."""
        reconnect_delay = 1.0

        while self.running:
            if self.zmq_socket is None or not self.zmq_connected:
                logger.warning("Attempting to reconnect to ZeroMQ...")
                if not self.init_zmq():
                    time.sleep(reconnect_delay)
                    continue

            try:
                # Receive frame data
                data = self.zmq_socket.recv()  # type: ignore  # noqa: PGH003
                self.frames_received += 1

                # Decode frame
                frame_array = np.frombuffer(data, dtype=np.uint8)
                frame = cv2.imdecode(frame_array, cv2.IMREAD_COLOR)

                if frame is None:
                    logger.warning("Failed to decode frame")
                    continue

                # Resize if needed
                if frame.shape[1] != self.width or frame.shape[0] != self.height:
                    frame = cv2.resize(frame, (self.width, self.height))

                # Convert BGR to RGB for pyvirtualcam
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                # Try to add to queue, drop old frames if full
                try:
                    self.frame_queue.put_nowait(frame)
                except queue.Full:
                    # Drop oldest frame and add new one
                    try:
                        self.frame_queue.get_nowait()
                        self.frames_dropped += 1
                        self.frame_queue.put_nowait(frame)
                    except queue.Empty:
                        pass

            except zmq.Again:
                # Timeout, no frame received
                continue
            except zmq.ZMQError as e:
                logger.error(f"ZeroMQ error: {e}")
                self.zmq_connected = False
                time.sleep(1)
            except Exception as e:
                logger.error(f"Error receiving frame: {e}")
                time.sleep(0.1)

    def write_frames(self) -> None:
        """Writer thread: Get frames from queue and write to virtual camera."""
        frame_interval = 1.0 / self.fps
        last_frame_time = time.time()

        while self.running:
            try:
                current_time = time.time()
                elapsed = current_time - last_frame_time

                # Maintain FPS timing
                if elapsed < frame_interval:
                    time.sleep(frame_interval - elapsed)
                    continue

                last_frame_time = current_time

                # Try to get frame from queue
                try:
                    frame = self.frame_queue.get(timeout=0.1)
                    self.last_frame = frame
                except queue.Empty:
                    # No frames available, use last frame if exists, otherwise black frame
                    frame = self.last_frame or self.create_black_frame()

                # Write to virtual camera
                if self.vcam:
                    self.vcam.send(frame)
                    self.frames_written += 1

            except Exception as e:
                logger.error(f"Error writing frame: {e}")
                time.sleep(0.1)

    def print_stats(self) -> None:
        """Print statistics periodically."""
        if self.stats_interval <= 0:
            return

        last_stats_time = time.time()

        while self.running:
            try:
                time.sleep(1)
                current_time = time.time()

                if current_time - last_stats_time >= self.stats_interval:
                    elapsed = current_time - last_stats_time

                    # Calculate FPS
                    received_delta = self.frames_received - self.last_received_count
                    written_delta = self.frames_written - self.last_written_count
                    receive_fps = received_delta / elapsed if elapsed > 0 else 0
                    write_fps = written_delta / elapsed if elapsed > 0 else 0

                    logger.info(
                        f"Stats - Received: {self.frames_received} ({receive_fps:.1f} fps), "
                        f"Dropped: {self.frames_dropped}, "
                        f"Written: {self.frames_written} ({write_fps:.1f} fps), "
                        f"Queue size: {self.frame_queue.qsize()}"
                    )

                    # Update counters for next interval
                    last_stats_time = current_time
                    self.last_received_count = self.frames_received
                    self.last_written_count = self.frames_written

            except Exception as e:
                logger.error(f"Error printing stats: {e}")

    def start(self) -> bool:
        """Start the virtual camera agent."""
        logger.info("Starting Virtual Camera Agent...")

        # Initialize virtual camera
        if not self.init_virtual_camera():
            logger.error("Failed to initialize virtual camera")
            return False

        # Initialize ZeroMQ (will retry in receiver thread if fails)
        self.init_zmq()

        # Set running flag
        self.running = True

        # Start threads
        self.receiver_thread = threading.Thread(target=self.receive_frames, daemon=True)
        self.writer_thread = threading.Thread(target=self.write_frames, daemon=True)
        stats_thread = threading.Thread(target=self.print_stats, daemon=True)

        self.receiver_thread.start()
        self.writer_thread.start()
        stats_thread.start()

        logger.info("Virtual Camera Agent started. Press Ctrl+C to stop.")
        return True

    def stop(self) -> None:
        """Stop the virtual camera agent."""
        logger.info("Stopping Virtual Camera Agent...")
        self.running = False

        # Wait for threads to finish
        if self.receiver_thread:
            self.receiver_thread.join(timeout=2)
        if self.writer_thread:
            self.writer_thread.join(timeout=2)

        # Close ZeroMQ
        if self.zmq_socket:
            self.zmq_socket.close()
        if self.zmq_context:
            self.zmq_context.term()

        # Close virtual camera
        if self.vcam:
            self.vcam.close()

        logger.info(
            f"Final stats - Received: {self.frames_received}, "
            f"Dropped: {self.frames_dropped}, "
            f"Written: {self.frames_written}"
        )
        logger.info("Virtual Camera Agent stopped.")

    def run(self) -> int:
        """Run the agent until interrupted."""
        if not self.start():
            return 1

        try:
            # Keep main thread alive
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Keyboard interrupt received.")
        finally:
            self.stop()

        return 0
