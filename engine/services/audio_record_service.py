import contextlib
import threading
from abc import ABC, abstractmethod
from queue import Queue
from typing import Any

import numpy as np
import pyaudiowpatch as pyaudio
import sounddevice as sd
from loguru import logger
from scipy.signal import resample_poly

from engine.services.audio_device_service import AudioDeviceService


class BaseAudioRecordService(ABC):
    """
    Abstract base class for audio recording services.
    Provides common queue management and interface for audio capture.
    """

    TARGET_RATE = 16_000

    def __init__(
        self,
        device_index: int,
        sample_rate: int,
        channels: int,
        block_duration: float = 0.1,
        queue_maxsize: int = 40,
    ) -> None:
        self.device_index = device_index
        self.sample_rate = sample_rate
        self.channels = channels
        self.block_duration = block_duration
        self.blocksize = int(self.sample_rate * self.block_duration)

        # Thread-safe queue for audio frames (numpy float32 arrays)
        self.audio_queue: Queue[np.ndarray[Any, Any]] = Queue(maxsize=queue_maxsize)

        # Threading flags
        self.running = threading.Event()
        self._stop_event = threading.Event()

    def _process_audio(self, data_np: np.ndarray[Any, Any]) -> None:
        """Process audio data: convert to mono, resample, and enqueue."""
        # Convert to mono if needed
        if self.channels > 1:
            try:
                data_np = data_np.reshape(-1, self.channels).mean(axis=1)
            except Exception:
                # fallback: take first channel if reshape fails
                data_np = data_np[:: self.channels]

        # Resample if needed
        if self.sample_rate != self.TARGET_RATE:
            data_np = resample_poly(data_np, self.TARGET_RATE, self.sample_rate)

        # Non-blocking enqueue: drop oldest if full
        try:
            if self.audio_queue.full():
                with contextlib.suppress(Exception):
                    self.audio_queue.get_nowait()
            self.audio_queue.put_nowait(data_np)
        except Exception:
            logger.debug("Dropping audio frame (queue full or error).")

    @abstractmethod
    def start(self, device_index: int | None = None) -> None:
        """Start audio capture."""

    @abstractmethod
    def stop(self, join_timeout: float = 5.0) -> None:
        """Stop audio capture."""

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

    def clear_queue(self) -> None:
        """Clear all audio frames from the queue."""
        try:
            while not self.audio_queue.empty():
                with contextlib.suppress(Exception):
                    self.audio_queue.get_nowait()
        except Exception:
            logger.debug("Error clearing audio queue.")


class AudioRecordService(BaseAudioRecordService):
    """
    Record audio from a microphone using sounddevice.
    Provides resampled mono float32 frames via a queue.
    """

    def __init__(
        self,
        device_index: int,
        block_duration: float = 0.1,
        queue_maxsize: int = 40,
    ) -> None:
        # Get device info using sounddevice
        dev_info = sd.query_devices(device_index)
        sample_rate = int(dev_info["default_samplerate"])
        channels = int(dev_info["max_input_channels"])

        super().__init__(
            device_index=device_index,
            sample_rate=sample_rate,
            channels=channels,
            block_duration=block_duration,
            queue_maxsize=queue_maxsize,
        )

        # sounddevice stream
        self.stream: sd.InputStream | None = None

    def _audio_callback(
        self,
        indata: np.ndarray[Any, Any],
        _frames: int,
        _time_info: sd.CallbackFlags,
        status: sd.CallbackFlags,
    ) -> None:
        """sounddevice callback: process audio and enqueue."""
        if status:
            logger.warning(f"Audio status: {status}")

        # indata is float32 in [-1, 1] from sounddevice
        data_np = indata.flatten().astype(np.float32)
        self._process_audio(data_np)

    def start(self, device_index: int | None = None) -> None:
        """Start sounddevice capture."""
        if self.running.is_set():
            logger.warning("AudioRecordService already running.")
            return

        if device_index is not None:
            self.device_index = device_index
            # Re-fetch device info for new device
            dev_info = sd.query_devices(device_index)
            self.sample_rate = int(dev_info["default_samplerate"])
            self.channels = int(dev_info["max_input_channels"])
            self.blocksize = int(self.sample_rate * self.block_duration)

        logger.info(f"Starting audio capture on device {self.device_index}...")
        self._stop_event.clear()

        try:
            self.stream = sd.InputStream(
                device=self.device_index,
                samplerate=self.sample_rate,
                channels=self.channels,
                blocksize=self.blocksize,
                dtype=np.float32,
                callback=self._audio_callback,
            )
            self.stream.start()
            self.running.set()
            logger.info("Audio capture started.")

        except Exception as ex:
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
        """Clean up sounddevice stream."""
        if self.stream:
            try:
                self.stream.stop()
            except Exception:
                logger.exception("Error stopping stream")
            try:
                self.stream.close()
            except Exception:
                logger.exception("Error closing stream")
            self.stream = None


class AudioLoopbackRecordService(BaseAudioRecordService):
    """
    Record system audio (loopback) using pyaudiowpatch WASAPI.
    Provides resampled mono float32 frames via a queue.
    Automatically discovers the default WASAPI loopback device.
    """

    def __init__(
        self,
        block_duration: float = 0.1,
        queue_maxsize: int = 40,
    ) -> None:
        # PyAudio objects
        self.pa = pyaudio.PyAudio()
        self.stream: pyaudio.Stream | None = None

        # Get default loopback device using pyaudiowpatch
        loopback_dev = self.pa.get_default_wasapi_loopback()
        device_index = int(loopback_dev.get("index", 0))
        sample_rate = int(loopback_dev.get("defaultSampleRate", 48000))
        channels = int(loopback_dev.get("maxInputChannels", 2))

        super().__init__(
            device_index=device_index,
            sample_rate=sample_rate,
            channels=channels,
            block_duration=block_duration,
            queue_maxsize=queue_maxsize,
        )

    def _audio_callback(
        self,
        in_data: bytes,
        _frame_count: int,
        _time_info: dict[str, Any],
        status_flags: int,
    ) -> tuple[Any, Any]:
        """PyAudio callback: convert to float32, process, and enqueue."""
        if status_flags:
            logger.warning(f"Audio status: {status_flags}")

        # Convert to float32 in [-1,1]
        data_np = np.frombuffer(in_data, dtype=np.int16).astype(np.float32) / 32768.0
        self._process_audio(data_np)

        return (None, pyaudio.paContinue)

    def start(self, device_index: int | None = None) -> None:
        """Start PyAudio loopback capture."""
        if self.running.is_set():
            logger.warning("AudioLoopbackRecordService already running.")
            return

        if device_index is not None:
            self.device_index = device_index
            # Re-fetch device info for new device
            dev_info = AudioDeviceService.get_device_info_by_index(device_index)
            self.sample_rate = int(dev_info["defaultSampleRate"])
            self.channels = int(dev_info["maxInputChannels"])
            self.blocksize = int(self.sample_rate * self.block_duration)

        logger.info(f"Starting loopback capture on device {self.device_index}...")
        self._stop_event.clear()

        try:
            self.stream = self.pa.open(
                format=pyaudio.paInt16,
                channels=self.channels,
                rate=self.sample_rate,
                input=True,
                input_device_index=self.device_index,
                frames_per_buffer=self.blocksize,
                stream_callback=self._audio_callback,
            )

            self.stream.start_stream()
            self.running.set()
            logger.info("Loopback capture started.")

        except Exception as ex:
            logger.exception(f"Failed to start loopback capture: {ex}")
            self._cleanup_resources()
            self.running.clear()
            self._stop_event.set()
            raise

    def stop(self, _join_timeout: float = 5.0) -> None:
        """Stop loopback capture."""
        if not self.running.is_set():
            logger.debug("AudioLoopbackRecordService not running.")
            return

        logger.info("Stopping loopback capture...")
        self.running.clear()
        self._stop_event.set()

        self._cleanup_resources()
        logger.info("Loopback capture stopped.")

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
