import contextlib
import threading
import time
from typing import Any

import numpy as np
import sounddevice as sd
from loguru import logger


class AudioControlService:
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

        # sounddevice stream
        self._stream: sd.Stream | None = None

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

    def _sd_callback(
        self,
        indata: np.ndarray[Any, Any],
        outdata: np.ndarray[Any, Any],
        frames: int,
        _time_info: sd.CallbackFlags,
        status: sd.CallbackFlags,
    ) -> None:
        """
        sounddevice callback signature:
        indata: numpy array of input samples (float32 in [-1, 1])
        outdata: numpy array to fill with output samples
        frames: number of frames
        """
        try:
            if status:
                logger.debug(f"sounddevice status: {status}")

            # indata is already float32 in [-1, 1]
            input_audio = indata.flatten()

            # Prepare output buffer
            delayed_audio = np.zeros(frames * self.channels, dtype=np.float32)

            # Circular buffer read/write with lock
            with self._buf_lock:
                for i in range(frames * self.channels):
                    delayed_audio[i] = self.delay_buffer[self.buffer_index]
                    # write new sample into buffer
                    self.delay_buffer[self.buffer_index] = input_audio[i]
                    self.buffer_index = (self.buffer_index + 1) % self.buffer_size

            # Fill output buffer
            outdata[:] = delayed_audio.reshape(-1, self.channels)

        except Exception as e:
            logger.exception(f"Error in sounddevice callback: {e}")
            # On error, output silence
            outdata.fill(0)

    def start(self) -> None:
        """
        Start the background thread that opens a sounddevice full-duplex stream and keeps it running.
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
        Stop the background thread and close the sounddevice stream.
        """
        if self.control_thread is not None:
            if not self._stop_event.is_set():
                self._stop_event.set()
            self.control_thread.join(timeout=join_timeout)
            self.control_thread = None

        # Ensure stream is closed
        if self._stream is not None:
            with contextlib.suppress(Exception):
                self._stream.stop()
            with contextlib.suppress(Exception):
                self._stream.close()
            self._stream = None

    def _delay_loop(self) -> None:
        """
        Open a sounddevice full-duplex stream and keep it running until stop event is set.
        If the stream fails, log and retry after a short delay.
        """
        while not self._stop_event.is_set():
            try:
                # Open full-duplex stream with float32 format
                self._stream = sd.Stream(
                    device=(self.input_device_id, self.output_device_id),
                    samplerate=self.sample_rate,
                    channels=self.channels,
                    blocksize=self.frames_per_buffer,
                    dtype=np.float32,
                    callback=self._sd_callback,
                )

                # Start the stream
                self._stream.start()

                # Keep thread alive while stream is active and not requested to stop
                while self._stream.active and not self._stop_event.is_set():
                    time.sleep(0.1)

                # Stop and close stream if loop exits
                with contextlib.suppress(Exception):
                    self._stream.stop()
                with contextlib.suppress(Exception):
                    self._stream.close()
                self._stream = None

            except Exception as e:
                logger.error(f"Error streaming audio with sounddevice: {e}")
                # Clean up partial resources
                with contextlib.suppress(Exception):
                    if self._stream is not None:
                        self._stream.close()
                self._stream = None

            # Backoff before retrying
            time.sleep(0.5)
