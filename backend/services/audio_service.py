from typing import Any

import pyaudiowpatch as pyaudio


class AudioService:
    _pa = pyaudio.PyAudio()

    @classmethod
    def get_input_devices(cls) -> list[dict[str, Any]]:
        return [device for device in cls._pa.get_device_info_generator() if device["maxInputChannels"] > 0]

    @classmethod
    def get_output_devices(cls) -> list[dict[str, Any]]:
        return [device for device in cls._pa.get_device_info_generator() if device["maxOutputChannels"] > 0]

    @classmethod
    def get_loopback_device(cls) -> dict[str, Any]:
        return cls._pa.get_default_wasapi_loopback()  # type: ignore  # noqa: PGH003
