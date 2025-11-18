from typing import Any

import pyaudiowpatch as pyaudio
import pytest
from loguru import logger

from app.services.asr_service import ASRService


@pytest.mark.asyncio
async def test_asr_service() -> None:
    def on_final(result_json: dict[str, Any]) -> None:
        logger.debug("Final:", result_json)

    def on_partial(result_json: dict[str, Any]) -> None:
        logger.debug("Partial:", result_json)

    pa = pyaudio.PyAudio()
    loopback_dev = pa.get_default_wasapi_loopback()

    service = ASRService(
        device_index=loopback_dev["index"],
        on_final=on_final,
        on_partial=on_partial,
    )

    # Run until interrupted
    await service.run_forever()
