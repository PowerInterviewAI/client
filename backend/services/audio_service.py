from typing import Any

import pyaudiowpatch as pyaudio


class AudioService:
    @classmethod
    def get_input_devices(cls) -> list[dict[str, Any]]:
        pa = pyaudio.PyAudio()
        ret = [device for device in pa.get_device_info_generator() if device["maxInputChannels"] > 0]
        pa.terminate()
        return ret

    @classmethod
    def get_output_devices(cls) -> list[dict[str, Any]]:
        pa = pyaudio.PyAudio()
        ret = [device for device in pa.get_device_info_generator() if device["maxOutputChannels"] > 0]
        pa.terminate()
        return ret
