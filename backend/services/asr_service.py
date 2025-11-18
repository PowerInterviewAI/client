import asyncio
import contextlib
from collections.abc import Callable
from typing import Any

import numpy as np
import pyaudiowpatch as pyaudio
from loguru import logger
from scipy.signal import resample_poly
from vosk import KaldiRecognizer, Model

from backend.cfg.fs import config as cfg_fs


class ASRService:
    """Async speech-to-text service using Vosk and pyaudiowpatch."""

    TARGET_RATE = 16_000

    def __init__(
        self,
        model_path: str | None = None,
        device_index: int | None = None,
        block_duration: float = 0.25,
        on_final: Callable[[str], None] | None = None,
        on_partial: Callable[[str], None] | None = None,
    ) -> None:
        pa = pyaudio.PyAudio()
        dev_info = pa.get_device_info_by_index(device_index)
        self.sample_rate = int(dev_info["defaultSampleRate"])
        self.channels = dev_info["maxInputChannels"]
        pa.terminate()

        self.model_path = model_path or cfg_fs.MODELS_DIR / "vosk-model-en-us-0.22-lgraph"
        self.device_index = device_index
        self.blocksize = int(self.sample_rate * block_duration)
        self.on_final = on_final
        self.on_partial = on_partial

        # Async management
        self.loop: asyncio.AbstractEventLoop | None = None
        self.audio_queue: asyncio.Queue[np.ndarray] = asyncio.Queue()
        self.running_event = asyncio.Event()
        self.stream: pyaudio.Stream | None = None
        self.task: asyncio.Task[None] | None = None

        # PyAudio setup
        self.pa = pyaudio.PyAudio()

        # Vosk setup
        logger.info(f"Loading Vosk model: {self.model_path}")
        self.model = Model(str(self.model_path))
        logger.info("Loaded Vosk model")
        self.recognizer = KaldiRecognizer(self.model, self.TARGET_RATE)
        self.recognizer.SetWords(True)  # noqa: FBT003

    def _audio_callback(
        self,
        in_data: np.ndarray,
        _frame_count: int,
        _time_info: dict[str, Any],
        status_flags: int,
    ) -> tuple[Any, Any]:
        """Called from PyAudio thread; enqueue audio data to async queue."""
        if status_flags:
            logger.warning(f"Audio status: {status_flags}")

        data_np = np.frombuffer(in_data, dtype=np.int16).astype(np.float32) / 32768.0
        if self.channels > 1:
            data_np = data_np.reshape(-1, self.channels).mean(axis=1)

        # --- Resample if needed ---
        if self.sample_rate != self.TARGET_RATE:
            # Sinc interpolation; keeps shape stable for streaming if block is small
            data_np = resample_poly(data_np, self.TARGET_RATE, self.sample_rate)

        # Non-blocking put into asyncio.Queue
        with contextlib.suppress(RuntimeError):
            if self.loop:
                self.loop.call_soon_threadsafe(self.audio_queue.put_nowait, data_np)

        return (None, pyaudio.paContinue)

    async def _worker(self) -> None:
        """Async consumer that reads from queue and performs recognition."""
        while self.running_event.is_set():
            data = await self.audio_queue.get()
            if data.size == 0:
                continue

            pcm16 = (data * 32767).astype(np.int16).tobytes()
            if self.recognizer.AcceptWaveform(pcm16):
                result = self.recognizer.Result()
                if self.on_final:
                    await self._maybe_await(self.on_final(result))
            else:
                partial = self.recognizer.PartialResult()
                if self.on_partial:
                    await self._maybe_await(self.on_partial(partial))

    @staticmethod
    async def _maybe_await(result: object) -> None:
        """If callback is async, await it."""
        if asyncio.iscoroutine(result):
            await result

    async def start(self) -> None:
        if self.running_event.is_set():
            logger.warning("ASRService already running.")
            return

        logger.info("Starting async ASRService...")
        self.running_event.set()

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

        # create worker task
        self.loop = asyncio.get_running_loop()
        self.task = asyncio.create_task(self._worker())
        logger.info("Audio input stream started async mode.")

    async def stop(self) -> None:
        if not self.running_event.is_set():
            logger.warning("ASRService not running.")
            return

        logger.info("Stopping ASRService...")
        self.running_event.clear()

        if self.task:
            await self.task

        if self.stream and self.stream.is_active():
            self.stream.stop_stream()
        if self.stream:
            self.stream.close()

        self.pa.terminate()
        logger.info("ASRService stopped.")

    async def run_forever(self) -> None:
        """Convenience loop to keep the service alive until Ctrl+C."""
        await self.start()
        logger.info("Listening... Press Ctrl+C to stop (async mode).")
        try:
            while self.running_event.is_set():  # noqa: ASYNC110
                await asyncio.sleep(0.1)
        except KeyboardInterrupt:
            logger.info("KeyboardInterrupt: stopping.")
            await self.stop()
