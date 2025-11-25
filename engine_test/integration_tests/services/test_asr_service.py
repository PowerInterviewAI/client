import json

import pyaudiowpatch as pyaudio
from loguru import logger

from engine.cfg.fs import config as cfg_fs
from engine.services.asr_service import ASRService


def test_asr_service() -> None:
    last_text = ""
    last_partial = ""

    def on_final(result_json: str) -> None:
        result_dict = json.loads(result_json)
        text = result_dict["text"]
        nonlocal last_text
        if text != last_text:
            logger.debug(f"FINAL: {text}")
            last_text = text

    def on_partial(result_json: str) -> None:
        result_dict = json.loads(result_json)
        partial = result_dict["partial"]
        nonlocal last_partial
        if partial != last_partial:
            logger.debug(f"PARTIAL: {partial}")
            last_partial = partial

    pa = pyaudio.PyAudio()
    loopback_dev = pa.get_default_wasapi_loopback()
    pa.terminate()

    service = ASRService(
        device_index=loopback_dev["index"],
        model_path=str(cfg_fs.MODELS_DIR / "vosk-model-en-us-0.22-lgraph"),
        on_final=on_final,
        on_partial=on_partial,
    )

    # Run until interrupted
    service.run_forever()
