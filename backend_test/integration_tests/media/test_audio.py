import json

import pyaudiowpatch as pyaudio
import sounddevice as sd
from loguru import logger


def test_audio_devices_list() -> None:
    devices = sd.query_devices()
    logger.debug(f"{sd.__version__}Devices:\n{devices}")


def test_pyaudio_device_list() -> None:
    pa = pyaudio.PyAudio()
    for i, dev in enumerate(pa.get_device_info_generator()):
        logger.debug(f"device {i}: {json.dumps(dev, indent=2)}")

    logger.debug(f"Default input device: {pa.get_default_input_device_info()}")
    logger.debug(f"Default output device: {pa.get_default_output_device_info()}")
    logger.debug(f"Default loopback device: {pa.get_default_wasapi_loopback()}")

    for i, host_api in enumerate(pa.get_host_api_info_generator()):
        logger.debug(f"host_api {i}: {json.dumps(host_api, indent=2)}")

    pa.terminate()
