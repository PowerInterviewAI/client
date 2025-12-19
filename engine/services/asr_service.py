import asyncio
import contextlib
import threading
from collections.abc import Callable, Coroutine
from queue import Queue
from typing import Any

import numpy as np
import pyaudiowpatch as pyaudio
import websockets
from loguru import logger
from scipy.signal import resample_poly
from websockets import ClientConnection

from engine.schemas.asr import ASRResult, ASRResultType
from engine.services.audio_service import AudioService


class ASRService:
    """
    Capture audio locally and stream raw PCM16 to a TranscribeStreaming server.
    Receives JSON transcript messages from the server and calls callbacks.
    No automatic reconnect; connect once per start() and stop on error or stop().
    """

    TARGET_RATE = 16_000

    def __init__(
        self,
        ws_uri: str,
        device_index: int,
        block_duration: float = 0.25,
        on_final: Callable[[str], Coroutine[Any, Any, None]] | None = None,
        on_partial: Callable[[str], Coroutine[Any, Any, None]] | None = None,
        queue_maxsize: int = 40,
    ) -> None:
        # Audio config
        dev_info = AudioService.get_device_info_by_index(device_index)
        self.sample_rate = int(dev_info["defaultSampleRate"])
        self.channels = dev_info["maxInputChannels"]

        self.device_index = device_index
        self.block_duration = block_duration
        self.blocksize = int(self.sample_rate * self.block_duration)
        self.on_final = on_final
        self.on_partial = on_partial

        # Thread-safe queue for audio frames (numpy float32 arrays)
        self.audio_queue: Queue[np.ndarray[Any, Any]] = Queue(maxsize=queue_maxsize)

        # Threading flags
        self.running = threading.Event()

        # PyAudio objects
        self.pa: pyaudio.PyAudio | None = None
        self.stream: pyaudio.Stream | None = None

        # Websocket / connection
        self.ws_uri = ws_uri
        self._ws: ClientConnection | None = None
        self._connect_task: asyncio.Task[Any] | None = None
        self._send_task: asyncio.Task[Any] | None = None
        self._recv_task: asyncio.Task[Any] | None = None
        self._loop: asyncio.AbstractEventLoop | None = None

        # Internal control
        self._stop_event = threading.Event()

    # -------------------------
    # Audio capture (threaded)
    # -------------------------
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

    # -------------------------
    # Start / stop capture
    # -------------------------
    def start_capture(self) -> None:
        """Start PyAudio capture."""
        if self.running.is_set():
            logger.warning("ASRClient already running.")
            return

        logger.info("Starting audio capture...")
        self.running.set()
        self._stop_event.clear()

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
        self.stream.start_stream()
        logger.info("Audio capture started.")

    def stop_capture(self, _join_timeout: float = 5.0) -> None:
        """Stop audio capture."""
        if not self.running.is_set():
            logger.warning("ASRClient not running.")
            return

        logger.info("Stopping audio capture...")
        self.running.clear()
        self._stop_event.set()

        if self.stream and self.stream.is_active():
            try:
                self.stream.stop_stream()
            except Exception:
                logger.exception("Error stopping stream")
        if self.stream:
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

        logger.info("Audio capture stopped.")

    # -------------------------
    # Async websocket helpers
    # -------------------------
    async def _get_next_audio(self) -> bytes:
        """
        Await next audio chunk from the thread-safe queue.
        Returns raw PCM16 bytes ready to send.
        This blocks in an executor so the event loop is not blocked.
        """
        loop = asyncio.get_running_loop()
        # Use blocking queue.get in executor; allow cancellation by checking stop_event after wake
        data_np = await loop.run_in_executor(None, self.audio_queue.get)
        # Convert to PCM16 bytes
        pcm16 = (data_np * 32767).astype(np.int16).tobytes()
        return pcm16  # noqa: RET504

    async def _send_loop(self, ws: ClientConnection) -> None:
        """Pull audio frames from queue and send to websocket as binary frames."""
        logger.info("Send loop started.")
        try:
            while True:
                # If stop requested, break promptly
                if self._stop_event.is_set():
                    logger.debug("Stop event set; exiting send loop.")
                    break

                try:
                    pcm_bytes = await self._get_next_audio()
                except asyncio.CancelledError:
                    raise
                except Exception as ex:
                    logger.exception(f"Failed to get audio chunk: {ex}")
                    # small sleep to avoid tight loop on repeated failures
                    await asyncio.sleep(0.05)
                    continue

                if not pcm_bytes:
                    await asyncio.sleep(0)
                    continue

                try:
                    await ws.send(pcm_bytes)
                except asyncio.CancelledError:
                    raise
                except Exception as ex:
                    logger.exception(f"Failed to send audio to websocket: {ex}")
                    # propagate to upper level to close connection and exit
                    raise
        finally:
            logger.info("Send loop stopped.")

    async def _recv_loop(self, ws: ClientConnection) -> None:
        """
        Receive transcript messages from server and call callbacks.
        Expects server to send JSON text messages like:
          {"type":"transcript","text":"..."} or {"type":"partial","text":"..."} or {"type":"transcribe_exception","message":"..."}
        """  # noqa: E501
        logger.info("Receive loop started.")
        try:
            while True:
                if self._stop_event.is_set():
                    logger.debug("Stop event set; exiting receive loop.")
                    break

                try:
                    msg = await ws.recv()
                except asyncio.CancelledError:
                    raise
                except Exception as ex:
                    logger.exception(f"Receive error from websocket: {ex}")
                    raise

                # If server sends bytes, ignore or log
                if isinstance(msg, (bytes, bytearray)):
                    logger.debug("Received binary message from server; ignoring.")
                    continue

                # Expect text
                try:
                    asr_result = ASRResult.model_validate_json(msg)
                except Exception:
                    logger.debug(f"Received non-json text from server: {msg}")
                    continue

                if asr_result.type is ASRResultType.FINAL:
                    if self.on_final:
                        try:
                            await self.on_final(asr_result.content)
                        except Exception:
                            logger.exception("on_final callback failed")
                elif asr_result.type is ASRResultType.PARTIAL:
                    if self.on_partial:
                        try:
                            await self.on_partial(asr_result.content)
                        except Exception:
                            logger.exception("on_partial callback failed")
                elif asr_result.type is ASRResultType.ERROR:
                    logger.error(f"Server error: {asr_result.content}")
                else:
                    logger.debug(f"Unhandled server message type: {asr_result}")
        finally:
            logger.info("Receive loop stopped.")

    async def _connect_and_stream(self, session_token: str | None = None) -> None:
        """
        Connect to websocket server and run send+recv loops concurrently.
        This connects once; on any error the task exits and must be restarted by calling start().
        """
        logger.info(f"Attempting websocket connect to {self.ws_uri}")
        try:
            # Prepare headers with session token if available
            additional_headers = {}
            if session_token:
                additional_headers["Cookie"] = f"session_token={session_token}"

            async with websockets.connect(self.ws_uri, ping_timeout=None, additional_headers=additional_headers) as ws:
                logger.info(f"Connected to server {self.ws_uri}")
                self._ws = ws

                # create tasks and keep references so stop() can cancel them
                self._send_task = asyncio.create_task(self._send_loop(ws), name="asrclient-send")
                self._recv_task = asyncio.create_task(self._recv_loop(ws), name="asrclient-recv")

                done, pending = await asyncio.wait(
                    {self._send_task, self._recv_task}, return_when=asyncio.FIRST_EXCEPTION
                )

                # Cancel pending tasks
                for p in pending:
                    p.cancel()
                    with contextlib.suppress(asyncio.CancelledError):
                        await p

                # If any task raised, re-raise to propagate error
                for d in done:
                    ex = d.exception()
                    if ex:
                        raise d.exception() from ex  # type: ignore  # noqa: PGH003, TRY301

        except asyncio.CancelledError:
            logger.info("Connect task cancelled.")
            raise
        except Exception as ex:
            logger.exception(f"Websocket connection or streaming failed: {ex}")
            # Task exits on error; no reconnect logic here.
        finally:
            # ensure tasks are cleared
            with contextlib.suppress(Exception):
                if self._send_task:
                    self._send_task.cancel()
            with contextlib.suppress(Exception):
                if self._recv_task:
                    self._recv_task.cancel()

            # close websocket if still open
            with contextlib.suppress(Exception):
                if self._ws:
                    await self._ws.close()
            self._ws = None

            # clear task refs
            self._send_task = None
            self._recv_task = None
            logger.info("Connect-and-stream task finished.")

    # -------------------------
    # Public async control
    # -------------------------
    async def start(self, device_index: int | None = None, session_token: str | None = None) -> None:
        """
        Start capture (sync) and start the asyncio connect/stream task.
        Must be called from an asyncio event loop.
        """
        if self._loop is None:
            self._loop = asyncio.get_running_loop()

        # Start capture synchronously
        if device_index is not None:
            self.device_index = device_index

        self.start_capture()

        # Start connect task (single connect, no reconnect)
        if self._connect_task is None or self._connect_task.done():
            self._connect_task = asyncio.create_task(self._connect_and_stream(session_token), name="asrclient-connect")
            logger.info("ASRClient connect task started.")

    async def stop(self) -> None:
        """
        Stop connect task and capture. Safe to call from asyncio.
        """
        logger.info("Stopping ASRClient...")

        # Signal stop
        self._stop_event.set()

        # Cancel connect task
        if self._connect_task:
            self._connect_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._connect_task
            self._connect_task = None

        # Cancel send/recv tasks if still present
        if self._send_task:
            self._send_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._send_task
            self._send_task = None

        if self._recv_task:
            self._recv_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._recv_task
            self._recv_task = None

        # Close active websocket
        if self._ws:
            with contextlib.suppress(Exception):
                await self._ws.close()
            self._ws = None

        # Stop capture (threaded) in executor to avoid blocking event loop
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self.stop_capture)

        logger.info("ASRClient stopped.")

    # -------------------------
    # Utility
    # -------------------------
    def is_running(self) -> bool:
        return self.running.is_set() and not self._stop_event.is_set()
