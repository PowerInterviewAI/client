import queue
import threading
import time
from collections.abc import Callable
from typing import Any

import numpy as np
import sounddevice as sd
from loguru import logger
from vosk import KaldiRecognizer, Model

from app.cfg.fs import config as cfg_fs


class ASRService:
    """Reusable service for live speech-to-text transcription using Vosk."""

    def __init__(
        self,
        model_path: str | None = None,
        sample_rate: int = 48000,
        channels: int = 2,
        device: int | None = None,
        block_duration: float = 0.25,
        on_final: Callable[[dict[str, Any]], None] | None = None,
        on_partial: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        """
        Args:
            model_path: Path to a Vosk model directory. Defaults to lgraph model.
            sample_rate: Audio sampling rate.
            channels: Input audio channels (1 or 2 typically).
            device: Input device ID (see sounddevice.query_devices()).
            block_duration: Duration (in seconds) of each audio block.
            on_final: Optional callback receiving final recognition results (dict).
            on_partial: Optional callback receiving partial recognition results (dict).
        """
        self.model_path = model_path or cfg_fs.MODELS_DIR / "vosk-model-en-us-0.22-lgraph"
        self.sample_rate = sample_rate
        self.channels = channels
        self.device = device
        self.blocksize = int(sample_rate * block_duration)
        self.on_final = on_final
        self.on_partial = on_partial

        # Internal state
        self.audio_queue: queue.Queue[np.ndarray] = queue.Queue()
        self.worker_thread: threading.Thread | None = None
        self.running = threading.Event()

        # Model and recognizer setup
        logger.info(f"Loading Vosk model: {self.model_path}")
        self.model = Model(str(self.model_path))
        logger.info("Loaded Vosk model")

        self.recognizer = KaldiRecognizer(self.model, self.sample_rate)
        self.recognizer.SetWords(True)  # noqa: FBT003

    # -------------------------
    # Audio Callback
    # -------------------------
    def _audio_callback(self, indata: np.ndarray, frames, time_info, status) -> None:  # type: ignore  # noqa: ANN001, ARG002, PGH003
        if status:
            logger.warning(f"Audio status: {status}")
        mono = indata.mean(axis=1) if indata.ndim > 1 else indata
        self.audio_queue.put(mono.copy())

    # -------------------------
    # Worker Thread
    # -------------------------
    def _worker(self) -> None:
        """Continuously consume audio frames and feed to recognizer."""
        while self.running.is_set():
            try:
                data = self.audio_queue.get(timeout=0.1)
            except queue.Empty:
                continue

            pcm16 = (data * 32767).astype(np.int16).tobytes()
            if self.recognizer.AcceptWaveform(pcm16):
                result_text = self.recognizer.Result()
                logger.info(f"[FINAL] {result_text}")
                if self.on_final:
                    self.on_final(result_text)
            else:
                partial_text = self.recognizer.PartialResult()
                logger.debug(f"[PARTIAL] {partial_text}")
                if self.on_partial:
                    self.on_partial(partial_text)

    # -------------------------
    # Public API
    # -------------------------
    def start(self) -> None:
        """Start capturing and recognizing audio."""
        if self.running.is_set():
            logger.warning("ASRService already running.")
            return

        logger.info("Starting ASRService...")
        self.running.set()
        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()

        self.stream = sd.InputStream(
            samplerate=self.sample_rate,
            channels=self.channels,
            dtype="float32",
            blocksize=self.blocksize,
            callback=self._audio_callback,
            device=self.device,
        )
        self.stream.start()
        logger.info("Audio input stream started.")

    def stop(self) -> None:
        """Stop audio capture and background worker."""
        if not self.running.is_set():
            logger.warning("ASRService not running.")
            return

        logger.info("Stopping ASRService...")
        self.running.clear()
        self.audio_queue.put(np.zeros(0))  # unblock queue

        if self.worker_thread:
            self.worker_thread.join()

        if self.stream.active:
            self.stream.stop()
        self.stream.close()
        logger.info("ASRService stopped.")

    def run_forever(self) -> None:
        """Convenience loop to keep the service alive until Ctrl+C."""
        self.start()
        logger.info("Listening... Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(0.1)
        except KeyboardInterrupt:
            logger.info("KeyboardInterrupt: stopping.")
            self.stop()
