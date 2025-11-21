import threading
from typing import Any

import pyaudiowpatch as pyaudio


class AudioService:
    _lock = threading.Lock()

    @classmethod
    def get_input_devices(cls) -> list[dict[str, Any]]:
        with cls._lock:
            pa = pyaudio.PyAudio()
            mme_host_apis = [
                host_api["index"] for host_api in pa.get_host_api_info_generator() if host_api["name"] == "MME"
            ]
            ret = [
                device
                for device in pa.get_device_info_generator()
                if device["maxInputChannels"] > 0 and device["hostApi"] in mme_host_apis
            ]
            pa.terminate()
            return ret

    @classmethod
    def get_output_devices(cls) -> list[dict[str, Any]]:
        with cls._lock:
            pa = pyaudio.PyAudio()
            mme_host_apis = [
                host_api["index"] for host_api in pa.get_host_api_info_generator() if host_api["name"] == "MME"
            ]
            ret = [
                device
                for device in pa.get_device_info_generator()
                if device["maxOutputChannels"] > 0 and device["hostApi"] in mme_host_apis
            ]
            pa.terminate()
            return ret

    @classmethod
    def get_loopback_device(cls) -> dict[str, Any]:
        with cls._lock:
            pa = pyaudio.PyAudio()
            ret = pa.get_default_wasapi_loopback()  # type: ignore  # noqa: PGH003
            pa.terminate()
            return ret

    @classmethod
    def get_device_info_by_index(cls, index: int) -> dict[str, Any]:
        with cls._lock:
            pa = pyaudio.PyAudio()
            ret = pa.get_device_info_by_index(index)  # type: ignore  # noqa: PGH003
            pa.terminate()
            return ret
