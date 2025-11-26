import contextlib
import threading
import time
from typing import Any

import numpy as np
import pyaudiowpatch as pyaudio
from loguru import logger


class AudioService:
    _lock = threading.Lock()

    @classmethod
    def get_input_devices(cls) -> list[dict[str, Any]]:
        with cls._lock:
            pa = pyaudio.PyAudio()
            mme_host_apis = [
                host_api["index"] for host_api in pa.get_host_api_info_generator() if host_api["name"] == "MME"
            ]
            ret = [
                device
                for device in pa.get_device_info_generator()
                if device["maxInputChannels"] > 0 and device["hostApi"] in mme_host_apis
            ]
            pa.terminate()
            return ret

    @classmethod
    def get_output_devices(cls) -> list[dict[str, Any]]:
        with cls._lock:
            pa = pyaudio.PyAudio()
            mme_host_apis = [
                host_api["index"] for host_api in pa.get_host_api_info_generator() if host_api["name"] == "MME"
            ]
            ret = [
                device
                for device in pa.get_device_info_generator()
                if device["maxOutputChannels"] > 0 and device["hostApi"] in mme_host_apis
            ]
            pa.terminate()
            return ret

    @classmethod
    def get_loopback_device(cls) -> dict[str, Any]:
        with cls._lock:
            pa = pyaudio.PyAudio()
            ret = pa.get_default_wasapi_loopback()
            pa.terminate()
            return ret  # type: ignore  # noqa: PGH003

    @classmethod
    def get_device_info_by_index(cls, index: int) -> dict[str, Any]:
        with cls._lock:
            pa = pyaudio.PyAudio()
            ret = pa.get_device_info_by_index(index)
            pa.terminate()
            return ret  # type: ignore  # noqa: PGH003


class AudioController:
    def __init__(
        self,
        input_device_id: int = 0,
        output_device_id: int = 0,
        delay_secs: float = 0,
        sample_rate: int = 44100,
        channels: int = 1,
        frames_per_buffer: int = 1024,
    ) -> None:
        self.input_device_id: int = input_device_id
        self.output_device_id: int = output_device_id
        self.delay_secs: float = delay_secs
        self.sample_rate: int = sample_rate
        self.channels: int = channels
        self.frames_per_buffer: int = frames_per_buffer

        # buffer holds interleaved samples (1D)
        self.buffer_size: int = 0
        self.delay_buffer = np.zeros(self.buffer_size, dtype=np.float32)
        self.buffer_index = 0

        self._buf_lock = threading.Lock()

        self.control_thread: threading.Thread | None = None
        self._stop_event = threading.Event()

        # PyAudio objects
        self._pa: pyaudio.PyAudio | None = None
        self._stream: Any = None  # pyaudio.Stream

    def update_parameters(
        self,
        input_device_id: int,
        output_device_id: int,
        delay_secs: float,
        sample_rate: int = 44100,
        channels: int = 1,
        frames_per_buffer: int = 1024,
    ) -> None:
        self.input_device_id = input_device_id
        self.output_device_id = output_device_id
        self.delay_secs = delay_secs
        self.sample_rate = sample_rate
        self.channels = channels
        self.frames_per_buffer = frames_per_buffer

    def _pa_callback(
        self,
        in_data: bytes,
        frame_count: int,
        _time_info: dict[str, Any],
        status_flags: int,
    ) -> tuple[bytes, int]:
        """
        PyAudio callback signature:
        in_data: bytes of interleaved float32 samples from input
        Return: (out_data_bytes, flag)
        """
        try:
            if status_flags:
                logger.debug(f"PyAudio status flags: {status_flags}")

            # Convert incoming bytes to numpy float32 array
            # in_data length = frame_count * channels * 4 (float32)
            if in_data:
                input_audio = np.frombuffer(in_data, dtype=np.float32)
            else:
                # If input is None or empty, use zeros
                input_audio = np.zeros(frame_count * self.channels, dtype=np.float32)

            # Prepare output buffer
            delayed_audio = np.zeros(frame_count * self.channels, dtype=np.float32)

            # Circular buffer read/write with lock
            with self._buf_lock:
                for i in range(frame_count * self.channels):
                    delayed_audio[i] = self.delay_buffer[self.buffer_index]
                    # write new sample into buffer
                    self.delay_buffer[self.buffer_index] = input_audio[i]
                    self.buffer_index = (self.buffer_index + 1) % self.buffer_size

            # Convert to bytes and return
            out_bytes = delayed_audio.tobytes()
            return (out_bytes, pyaudio.paContinue)  # noqa: TRY300

        except Exception as e:
            logger.exception(f"Error in PyAudio callback: {e}")
            # On error, output silence for this callback
            out_silence = (np.zeros(frame_count * self.channels, dtype=np.float32)).tobytes()
            return (out_silence, pyaudio.paContinue)

    def start(self) -> None:
        """
        Start the background thread that opens a PyAudio full-duplex stream and keeps it running.
        """
        # Stop existing thread
        self.stop()

        # buffer holds interleaved samples (1D)
        self.buffer_size = int(self.delay_secs * self.sample_rate * self.channels)
        if self.buffer_size <= 0:
            self.buffer_size = max(1, self.frames_per_buffer * self.channels)
        self.delay_buffer = np.zeros(self.buffer_size, dtype=np.float32)
        self.buffer_index = 0

        # Start delay thread
        self._stop_event.clear()
        self.control_thread = threading.Thread(target=self._delay_loop, daemon=True)
        self.control_thread.start()

    def stop(self, join_timeout: float = 5.0) -> None:
        """
        Stop the background thread and close the PyAudio stream and instance.
        """
        if self.control_thread is not None:
            if not self._stop_event.is_set():
                self._stop_event.set()
            self.control_thread.join(timeout=join_timeout)
            self.control_thread = None

        # Ensure stream and pa are closed
        try:
            if self._stream is not None:
                with contextlib.suppress(Exception):
                    if self._stream.is_active():
                        self._stream.stop_stream()
                with contextlib.suppress(Exception):
                    self._stream.close()
                self._stream = None
        finally:
            if self._pa is not None:
                with contextlib.suppress(Exception):
                    self._pa.terminate()
                self._pa = None

    def _delay_loop(self) -> None:
        """
        Open a PyAudio full-duplex stream and keep it running until stop event is set.
        If the stream fails, log and retry after a short delay.
        """
        while not self._stop_event.is_set():
            try:
                # Create PyAudio instance
                self._pa = pyaudio.PyAudio()

                # Open full-duplex stream with float32 format
                self._stream = self._pa.open(
                    format=pyaudio.paFloat32,
                    channels=self.channels,
                    rate=self.sample_rate,
                    input=True,
                    output=True,
                    input_device_index=self.input_device_id,
                    output_device_index=self.output_device_id,
                    frames_per_buffer=self.frames_per_buffer,
                    stream_callback=self._pa_callback,
                )

                # Start the stream (callback-based)
                self._stream.start_stream()

                # Keep thread alive while stream is active and not requested to stop
                while self._stream.is_active() and not self._stop_event.is_set():
                    time.sleep(0.1)

                # Stop and close stream if loop exits
                with contextlib.suppress(Exception):
                    if self._stream.is_active():
                        self._stream.stop_stream()
                with contextlib.suppress(Exception):
                    self._stream.close()
                self._stream = None

                # Terminate PyAudio instance
                with contextlib.suppress(Exception):
                    self._pa.terminate()
                self._pa = None

            except Exception as e:
                logger.error(f"Error streaming audio with PyAudio: {e}")
                # Clean up partial resources
                with contextlib.suppress(Exception):
                    if self._stream is not None:
                        self._stream.close()
                self._stream = None
                with contextlib.suppress(Exception):
                    if self._pa is not None:
                        self._pa.terminate()
                self._pa = None

            # Backoff before retrying
            time.sleep(0.5)
