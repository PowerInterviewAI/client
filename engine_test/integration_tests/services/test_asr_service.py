import time

import pyaudiowpatch as pyaudio
from loguru import logger

from engine.services.asr_service import ASRService


def test_asr_service() -> None:
    last_text = ""
    last_partial = ""

    def on_final(final: str) -> None:
        nonlocal last_text
        if final != last_text:
            logger.debug(f"FINAL: {final}")
            last_text = final

    def on_partial(partial: str) -> None:
        nonlocal last_partial
        if partial != last_partial:
            logger.debug(f"PARTIAL: {partial}")
            last_partial = partial

    pa = pyaudio.PyAudio()
    loopback_dev = pa.get_default_wasapi_loopback()
    pa.terminate()

    service = ASRService(
        ws_uri="ws://localhost:8080/api/asr/streaming",
        device_index=loopback_dev["index"],
        on_final=on_final,
        on_partial=on_partial,
    )

    # Run until interrupted
    service.start()
    while True:
        try:
            time.sleep(1)
        except KeyboardInterrupt:
            break
