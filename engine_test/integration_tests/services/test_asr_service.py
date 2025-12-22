import time

from loguru import logger

from engine.services.asr_service import ASRService
from engine.services.audio_record_service import AudioLoopbackRecordService


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

    service = ASRService(
        ws_uri="ws://localhost:8080/api/asr/streaming",
        on_final=on_final,
        on_partial=on_partial,
    )

    # Create audio recorder
    audio_recorder = AudioLoopbackRecordService()

    # Start audio recorder
    audio_recorder.start()

    # Run until interrupted
    service.start(audio_recorder=audio_recorder)
    while True:
        try:
            time.sleep(1)
        except KeyboardInterrupt:
            break
