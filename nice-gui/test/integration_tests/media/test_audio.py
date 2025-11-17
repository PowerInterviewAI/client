import sounddevice as sd
from loguru import logger


def test_audio_devices_list() -> None:
    devices = sd.query_devices()
    logger.debug(f"{sd.__version__}Devices:\n{devices}")
