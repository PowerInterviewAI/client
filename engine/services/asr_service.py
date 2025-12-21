import asyncio
import contextlib
import threading
from collections.abc import Callable

import numpy as np
import websockets
from loguru import logger
from websockets import ClientConnection

from engine.cfg.asr import config as cfg_asr
from engine.schemas.asr import ASRResult, ASRResultType
from engine.services.audio_record_service import AudioRecordService


class ASRService:
    """
    Stream audio to a TranscribeStreaming server via WebSocket.
    Receives JSON transcript messages from the server and calls callbacks.
    Uses AudioRecordService for audio capture.
    No automatic reconnect; connect once per start() and stop on error or stop().
    """

    def __init__(
        self,
        ws_uri: str,
        device_index: int,
        block_duration: float = 0.1,
        on_final: Callable[[str], None] | None = None,
        on_partial: Callable[[str], None] | None = None,
        queue_maxsize: int = 40,
    ) -> None:
        # Callbacks for transcript results
        self.on_final = on_final
        self.on_partial = on_partial

        # Audio recorder
        self.audio_recorder = AudioRecordService(
            device_index=device_index,
            block_duration=block_duration,
            queue_maxsize=queue_maxsize,
        )

        # Websocket config
        self.ws_uri = ws_uri
        self._ws: ClientConnection | None = None
        self._ws_thread: threading.Thread | None = None

        # Internal control
        self._stop_event = threading.Event()

    # -------------------------
    # Async websocket helpers
    # -------------------------
    async def _get_next_audio(self) -> bytes:
        """
        Await next audio chunk from the audio recorder.
        Returns raw PCM16 bytes ready to send.
        This blocks in an executor so the event loop is not blocked.
        """
        loop = asyncio.get_running_loop()
        while True:
            if self._stop_event.is_set():
                msg = "Stop requested"
                raise asyncio.CancelledError(msg)

            data_np = await loop.run_in_executor(
                None,
                lambda: self.audio_recorder.get_audio_frame(timeout=0.1),
            )
            if data_np is not None:
                break

        # Convert to PCM16 bytes
        pcm16 = (data_np * 32767).astype(np.int16).tobytes()
        return pcm16  # noqa: RET504

    async def _send_loop(self, ws: ClientConnection) -> None:
        """Pull audio frames from recorder and send to websocket as binary frames."""
        logger.info("Send loop started.")
        try:
            while True:
                # If stop requested, break promptly
                if self._stop_event.is_set():
                    logger.debug("Stop event set; exiting send loop.")
                    break

                try:
                    pcm_bytes = await asyncio.wait_for(
                        self._get_next_audio(),
                        timeout=cfg_asr.SILENCE_INTERVAL_SECONDS,
                    )
                except TimeoutError:
                    # Send silence frame to keep connection alive
                    silence_bytes = cfg_asr.SILENCE_FRAME
                    try:
                        await ws.send(silence_bytes)
                        logger.debug("Sent silence frame.")
                    except asyncio.CancelledError:
                        raise
                    except Exception as ex:
                        logger.exception(f"Failed to send silence to websocket: {ex}")
                        raise
                    continue
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
                    msg = await asyncio.wait_for(ws.recv(), timeout=0.1)
                except TimeoutError:
                    continue
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
                            self.on_final(asr_result.content)
                        except Exception:
                            logger.exception("on_final callback failed")
                elif asr_result.type is ASRResultType.PARTIAL:
                    if self.on_partial:
                        try:
                            self.on_partial(asr_result.content)
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
            additional_headers: dict[str, str] = {}
            if session_token:
                additional_headers["Cookie"] = f"session_token={session_token}"

            async with websockets.connect(
                self.ws_uri,
                ping_timeout=None,
                additional_headers=additional_headers,
            ) as ws:
                logger.info(f"Connected to server {self.ws_uri}")
                self._ws = ws

                # Run send and recv loops concurrently
                await asyncio.gather(self._send_loop(ws), self._recv_loop(ws))

        except asyncio.CancelledError:
            logger.info("Connect task cancelled.")
            raise
        except Exception as ex:
            logger.exception(f"Websocket connection or streaming failed: {ex}")
            # Task exits on error; no reconnect logic here.
        finally:
            # close websocket if still open
            with contextlib.suppress(Exception):
                if self._ws:
                    await self._ws.close()
            self._ws = None

            logger.info("Connect-and-stream task finished.")

    # -------------------------
    # Public sync control
    # -------------------------
    def start(self, device_index: int | None = None, session_token: str | None = None) -> None:
        """
        Start audio capture and start the asyncio connect/stream task in background.
        """
        self._stop_event.clear()

        # Start audio recording
        self.audio_recorder.start(device_index=device_index)

        # Start connect task in background thread
        if self._ws_thread is None or not self._ws_thread.is_alive():
            self._ws_thread = threading.Thread(
                target=lambda: asyncio.run(self._connect_and_stream(session_token)),
                daemon=True,
                name="asr-websocket",
            )
            self._ws_thread.start()

    def stop(self) -> None:
        """
        Stop connect task and capture. Safe to call synchronously.
        """
        logger.info("Stopping ASRService...")

        # Signal stop
        self._stop_event.set()

        # Stop audio recording
        self.audio_recorder.stop()

        # Wait for websocket thread to finish
        if self._ws_thread and self._ws_thread.is_alive():
            self._ws_thread.join(timeout=5.0)
            if self._ws_thread.is_alive():
                logger.warning("Websocket thread did not stop within timeout")

        logger.info("ASRService stopped.")

    # -------------------------
    # Utility
    # -------------------------
    def is_running(self) -> bool:
        """Check if the service is running."""
        return self.audio_recorder.is_running() and not self._stop_event.is_set()
