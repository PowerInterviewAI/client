import contextlib
import threading
from queue import Queue
from typing import Any

import numpy as np
import pyaudiowpatch as pyaudio
from loguru import logger
from scipy.signal import resample_poly

from engine.services.audio_service import AudioService


class AudioRecordService:
    """
    Record audio from a device and provide resampled PCM16 frames via a queue.
    Handles PyAudio capture, mono conversion, and resampling to target rate.
    """

    TARGET_RATE = 16_000

    def __init__(
        self,
        device_index: int,
        block_duration: float = 0.1,
        queue_maxsize: int = 40,
    ) -> None:
        # Audio config from device
        dev_info = AudioService.get_device_info_by_index(device_index)
        self.sample_rate = int(dev_info["defaultSampleRate"])
        self.channels = dev_info["maxInputChannels"]

        self.device_index = device_index
        self.block_duration = block_duration
        self.blocksize = int(self.sample_rate * self.block_duration)

        # Thread-safe queue for audio frames (numpy float32 arrays)
        self.audio_queue: Queue[np.ndarray[Any, Any]] = Queue(maxsize=queue_maxsize)

        # Threading flags
        self.running = threading.Event()
        self._stop_event = threading.Event()

        # PyAudio objects
        self.pa: pyaudio.PyAudio | None = None
        self.stream: pyaudio.Stream | None = None

    def _audio_callback(
        self,
        in_data: bytes,
        _frame_count: int,
        _time_info: dict[str, Any],
        status_flags: int,
    ) -> tuple[Any, Any]:
        """PyAudio callback: convert to float32 mono, resample if needed, enqueue."""
        if status_flags:
            logger.warning(f"Audio status: {status_flags}")

        # Convert to float32 in [-1,1]
        data_np = np.frombuffer(in_data, dtype=np.int16).astype(np.float32) / 32768.0

        if self.channels > 1:
            try:
                data_np = data_np.reshape(-1, self.channels).mean(axis=1)
            except Exception:
                # fallback: take first channel if reshape fails
                data_np = data_np[:: self.channels]

        if self.sample_rate != self.TARGET_RATE:
            data_np = resample_poly(data_np, self.TARGET_RATE, self.sample_rate)

        # Non-blocking enqueue: drop oldest if full
        try:
            if self.audio_queue.full():
                with contextlib.suppress(Exception):
                    self.audio_queue.get_nowait()
            self.audio_queue.put_nowait(data_np)
        except Exception:
            # If put_nowait fails for any reason, drop the frame silently
            logger.debug("Dropping audio frame (queue full or error).")

        return (None, pyaudio.paContinue)

    def start(self, device_index: int | None = None) -> None:
        """Start PyAudio capture."""
        if self.running.is_set():
            logger.warning("AudioRecordService already running.")
            return

        if device_index is not None:
            self.device_index = device_index
            # Re-fetch device info for new device
            dev_info = AudioService.get_device_info_by_index(device_index)
            self.sample_rate = int(dev_info["defaultSampleRate"])
            self.channels = dev_info["maxInputChannels"]
            self.blocksize = int(self.sample_rate * self.block_duration)

        logger.info(f"Starting audio capture on device {self.device_index}...")
        self._stop_event.clear()

        try:
            self.pa = pyaudio.PyAudio()
            self.stream = self.pa.open(
                format=pyaudio.paInt16,
                channels=self.channels,
                rate=self.sample_rate,
                input=True,
                input_device_index=self.device_index,
                frames_per_buffer=self.blocksize,
                stream_callback=self._audio_callback,
            )

            # Start stream and mark running only after success
            self.stream.start_stream()
            self.running.set()
            logger.info("Audio capture started.")

        except Exception as ex:
            # Ensure resources are cleaned and state reset on failure
            logger.exception(f"Failed to start audio capture: {ex}")
            self._cleanup_resources()
            self.running.clear()
            self._stop_event.set()
            raise

    def stop(self, _join_timeout: float = 5.0) -> None:
        """Stop audio capture."""
        if not self.running.is_set():
            logger.debug("AudioRecordService not running.")
            return

        logger.info("Stopping audio capture...")
        self.running.clear()
        self._stop_event.set()

        self._cleanup_resources()
        logger.info("Audio capture stopped.")

    def _cleanup_resources(self) -> None:
        """Clean up PyAudio stream and instance."""
        if self.stream:
            try:
                if self.stream.is_active():
                    self.stream.stop_stream()
            except Exception:
                logger.exception("Error stopping stream")
            try:
                self.stream.close()
            except Exception:
                logger.exception("Error closing stream")
            self.stream = None

        if self.pa:
            try:
                self.pa.terminate()
            except Exception:
                logger.exception("Error terminating PyAudio")
            self.pa = None

    def is_running(self) -> bool:
        """Check if capture is running."""
        return self.running.is_set() and not self._stop_event.is_set()

    def is_stop_requested(self) -> bool:
        """Check if stop has been requested."""
        return self._stop_event.is_set()

    def get_audio_frame(self, timeout: float = 0.1) -> np.ndarray[Any, Any] | None:
        """
        Get next audio frame from queue with timeout.
        Returns None if timeout or stop requested.
        """
        if self._stop_event.is_set():
            return None
        try:
            return self.audio_queue.get(timeout=timeout)
        except Exception:
            return None
