import contextlib
import threading
from collections.abc import Callable
from queue import Empty, Queue
from typing import Any

import numpy as np
import pyaudiowpatch as pyaudio
from loguru import logger
from scipy.signal import resample_poly
from vosk import KaldiRecognizer, Model

from backend.cfg.fs import config as cfg_fs


class ASRService:
    """Synchronous speech-to-text service using Vosk and PyAudio."""

    _pa = pyaudio.PyAudio()
    _model: Model | None = None

    TARGET_RATE = 16_000

    def __init__(
        self,
        model_path: str | None = None,
        device_index: int | None = None,
        block_duration: float = 0.25,
        on_final: Callable[[str], None] | None = None,
        on_partial: Callable[[str], None] | None = None,
    ) -> None:
        dev_info = self._pa.get_device_info_by_index(device_index)
        self.sample_rate = int(dev_info["defaultSampleRate"])
        self.channels = dev_info["maxInputChannels"]

        self.model_path = model_path or cfg_fs.MODELS_DIR / "vosk-model-en-us-0.22-lgraph"

        self.device_index = device_index
        self.block_duration = block_duration
        self.blocksize = int(self.sample_rate * self.block_duration)
        self.on_final = on_final
        self.on_partial = on_partial

        # Threading
        self.audio_queue: Queue[np.ndarray] = Queue(maxsize=20)
        self.running = threading.Event()
        self.worker_thread: threading.Thread | None = None

        # PyAudio setup
        self.pa = pyaudio.PyAudio()

        # Vosk setup
        if not self._model:
            logger.info(f"Loading Vosk model: {self.model_path}")
            self._model = Model(str(self.model_path))

        logger.info("Loaded Vosk model")
        self.recognizer = KaldiRecognizer(self._model, self.TARGET_RATE)
        self.recognizer.SetWords(True)  # noqa: FBT003

        self.stream: pyaudio.Stream | None = None

    def _audio_callback(
        self,
        in_data: bytes,
        _frame_count: int,
        _time_info: dict[str, Any],
        status_flags: int,
    ) -> tuple[Any, Any]:
        """Called from PyAudio thread; enqueue audio data."""
        if status_flags:
            logger.warning(f"Audio status: {status_flags}")

        data_np = np.frombuffer(in_data, dtype=np.int16).astype(np.float32) / 32768.0
        if self.channels > 1:
            data_np = data_np.reshape(-1, self.channels).mean(axis=1)

        if self.sample_rate != self.TARGET_RATE:
            data_np = resample_poly(data_np, self.TARGET_RATE, self.sample_rate)

        # Try non-blocking put
        with contextlib.suppress(Exception):
            if self.audio_queue.full():
                self.audio_queue.get_nowait()
            self.audio_queue.put_nowait(data_np)

        return (None, pyaudio.paContinue)

    def _worker(self) -> None:
        """Worker thread that consumes audio queue and runs recognition."""
        logger.debug("Recognition worker started.")
        while self.running.is_set():
            try:
                data = self.audio_queue.get(timeout=0.1)
            except Empty:
                continue

            if data.size == 0:
                continue

            pcm16 = (data * 32767).astype(np.int16).tobytes()
            if self.recognizer.AcceptWaveform(pcm16):
                result = self.recognizer.Result()
                if self.on_final:
                    self.on_final(result)
            else:
                partial = self.recognizer.PartialResult()
                if self.on_partial:
                    self.on_partial(partial)
        logger.debug("Recognition worker stopped.")

    def start(
        self,
        device_index: int | None = None,
    ) -> None:
        self.stop()

        if device_index is not None:
            dev_info = self._pa.get_device_info_by_index(device_index)
            self.sample_rate = int(dev_info["defaultSampleRate"])
            self.channels = dev_info["maxInputChannels"]

            self.device_index = device_index
            self.blocksize = int(self.sample_rate * self.block_duration)

        logger.info("Starting ASRService (sync)...")
        self.running.set()

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

        # Worker thread
        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()
        logger.info("Audio input stream started (sync mode).")

    def stop(self) -> None:
        if not self.running.is_set():
            logger.warning("ASRService not running.")
            return

        logger.info("Stopping ASRService...")
        self.running.clear()

        if self.worker_thread and self.worker_thread.is_alive():
            self.worker_thread.join(timeout=2)

        if self.stream and self.stream.is_active():
            self.stream.stop_stream()
        if self.stream:
            self.stream.close()

        self.recognizer.Result()

        logger.info("ASRService stopped.")

    def run_forever(self) -> None:
        """Blocking loop to keep the service active."""
        self.start()
        logger.info("Listening... Press Ctrl+C to stop (sync mode).")
        try:
            while self.running.is_set():
                threading.Event().wait(0.1)
        except KeyboardInterrupt:
            logger.info("KeyboardInterrupt: stopping.")
            self.stop()
