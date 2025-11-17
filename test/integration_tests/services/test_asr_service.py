from typing import Any

from loguru import logger

from app.services.asr_service import ASRService


def test_asr_service() -> None:
    def on_final(result_json: dict[str, Any]) -> None:
        logger.debug("Final:", result_json)

    def on_partial(result_json: dict[str, Any]) -> None:
        logger.debug("Partial:", result_json)

    service = ASRService(
        device=22,
        channels=2,
        on_final=on_final,
        on_partial=on_partial,
    )

    # Run until interrupted
    service.run_forever()
