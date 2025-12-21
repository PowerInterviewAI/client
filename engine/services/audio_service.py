import contextlib
import ctypes
import threading
import time
from typing import Any

import numpy as np
import sounddevice as sd
from loguru import logger


class AudioDeviceService:
    """
    Service for managing audio device enumeration and information using Windows API.

    Uses Windows Multimedia API (MME) directly for device enumeration, avoiding
    PortAudio limitations and stream interruptions.
    """

    # Windows API constants and structures
    WAVE_MAPPER = -1

    class WAVEINCAPS(ctypes.Structure):
        _fields_ = [  # noqa: RUF012
            ("wMid", ctypes.c_ushort),
            ("wPid", ctypes.c_ushort),
            ("vDriverVersion", ctypes.c_uint),
            ("szPname", ctypes.c_char * 32),
            ("dwFormats", ctypes.c_uint),
            ("wChannels", ctypes.c_ushort),
            ("wReserved1", ctypes.c_ushort),
        ]

    class WAVEOUTCAPS(ctypes.Structure):
        _fields_ = [  # noqa: RUF012
            ("wMid", ctypes.c_ushort),
            ("wPid", ctypes.c_ushort),
            ("vDriverVersion", ctypes.c_uint),
            ("szPname", ctypes.c_char * 32),
            ("dwFormats", ctypes.c_uint),
            ("wChannels", ctypes.c_ushort),
            ("wReserved1", ctypes.c_ushort),
            ("dwSupport", ctypes.c_uint),
        ]

    # Load Windows API functions
    try:
        winmm = ctypes.windll.winmm

        # Input device functions
        waveInGetNumDevs = winmm.waveInGetNumDevs  # noqa: N815
        waveInGetNumDevs.restype = ctypes.c_uint

        waveInGetDevCaps = winmm.waveInGetDevCapsA  # noqa: N815
        waveInGetDevCaps.argtypes = [ctypes.c_uint, ctypes.POINTER(WAVEINCAPS), ctypes.c_uint]

        # Output device functions
        waveOutGetNumDevs = winmm.waveOutGetNumDevs  # noqa: N815
        waveOutGetNumDevs.restype = ctypes.c_uint

        waveOutGetDevCaps = winmm.waveOutGetDevCapsA  # noqa: N815
        waveOutGetDevCaps.argtypes = [ctypes.c_uint, ctypes.POINTER(WAVEOUTCAPS), ctypes.c_uint]

    except AttributeError:
        logger.warning("Windows Multimedia API not available")
        winmm = None

    @classmethod
    def _query_input_devices(cls) -> list[dict[str, Any]]:
        """Query input devices using Windows Multimedia API."""
        if cls.winmm is None:
            logger.warning("Windows API not available, falling back to sounddevice")
            return cls._fallback_query_devices(input_only=True)

        devices = []
        try:
            num_devices = cls.waveInGetNumDevs()
            for i in range(num_devices):
                caps = cls.WAVEINCAPS()
                result = cls.waveInGetDevCaps(i, ctypes.byref(caps), ctypes.sizeof(caps))
                if result == 0:  # MMSYSERR_NOERROR
                    device_name = caps.szPname.decode("ascii", errors="ignore").rstrip("\x00")
                    # Find corresponding sounddevice index
                    sd_index = cls._find_sounddevice_index(device_name, is_input=True)
                    devices.append(
                        {
                            "index": sd_index if sd_index >= 0 else i,  # Use SD index if found, otherwise MME index
                            "name": device_name,
                            "max_input_channels": caps.wChannels,
                            "max_output_channels": 0,
                            "default_samplerate": 44100,  # Default for MME
                            "hostapi": 0,  # MME host API index
                        }
                    )
        except Exception as e:
            logger.warning(f"Failed to query input devices via Windows API: {e}")
            return cls._fallback_query_devices(input_only=True)

        return devices

    @classmethod
    def _query_output_devices(cls) -> list[dict[str, Any]]:
        """Query output devices using Windows Multimedia API."""
        if cls.winmm is None:
            logger.warning("Windows API not available, falling back to sounddevice")
            return cls._fallback_query_devices(output_only=True)

        devices = []
        try:
            num_devices = cls.waveOutGetNumDevs()
            for i in range(num_devices):
                caps = cls.WAVEOUTCAPS()
                result = cls.waveOutGetDevCaps(i, ctypes.byref(caps), ctypes.sizeof(caps))
                if result == 0:  # MMSYSERR_NOERROR
                    device_name = caps.szPname.decode("ascii", errors="ignore").rstrip("\x00")
                    # Find corresponding sounddevice index
                    sd_index = cls._find_sounddevice_index(device_name, is_input=False)
                    devices.append(
                        {
                            "index": sd_index if sd_index >= 0 else i,  # Use SD index if found, otherwise MME index
                            "name": device_name,
                            "max_input_channels": 0,
                            "max_output_channels": caps.wChannels,
                            "default_samplerate": 44100,  # Default for MME
                            "hostapi": 0,  # MME host API index
                        }
                    )
        except Exception as e:
            logger.warning(f"Failed to query output devices via Windows API: {e}")
            return cls._fallback_query_devices(output_only=True)

        return devices

    @classmethod
    def _find_sounddevice_index(cls, device_name: str, is_input: bool) -> int:  # noqa: FBT001
        """Find the sounddevice global index for a device name."""
        try:
            devices = sd.query_devices()
            for device in devices:
                if device["name"] == device_name:  # noqa: SIM102
                    # Check if it matches the channel type we're looking for
                    if (is_input and device["max_input_channels"] > 0) or (
                        not is_input and device["max_output_channels"] > 0
                    ):
                        return device["index"]
            return -1  # Not found  # noqa: TRY300
        except Exception:
            return -1

    @classmethod
    def _fallback_query_devices(cls, input_only: bool = False, output_only: bool = False) -> list[dict[str, Any]]:  # noqa: FBT001, FBT002
        """Fallback to sounddevice when Windows API is not available."""
        try:
            devices = sd.query_devices()
            result = []
            for device in devices:
                if input_only and device["max_input_channels"] == 0:
                    continue
                if output_only and device["max_output_channels"] == 0:
                    continue
                result.append(dict(device))
            return result  # noqa: TRY300
        except Exception as e:
            logger.error(f"Fallback device query failed: {e}")
            return []

    @classmethod
    def get_audio_devices(cls) -> list[dict[str, Any]]:
        """Get all MME audio devices (input and output) using Windows API."""
        input_devices = cls._query_input_devices()
        output_devices = cls._query_output_devices()

        # Combine and deduplicate devices (some may support both input and output)
        all_devices = {}
        for device in input_devices + output_devices:
            index = device["index"]
            if index not in all_devices:
                all_devices[index] = device.copy()
            else:
                # Merge channels if device supports both
                existing = all_devices[index]
                existing["max_input_channels"] = max(existing["max_input_channels"], device["max_input_channels"])
                existing["max_output_channels"] = max(existing["max_output_channels"], device["max_output_channels"])

        return list(all_devices.values())

    @classmethod
    def get_input_devices(cls) -> list[dict[str, Any]]:
        """Get MME input devices using Windows API."""
        return cls._query_input_devices()

    @classmethod
    def get_output_devices(cls) -> list[dict[str, Any]]:
        """Get MME output devices using Windows API."""
        return cls._query_output_devices()

    @classmethod
    def get_device_info_by_index(cls, index: int) -> dict[str, Any]:
        """Get device info by index using sounddevice (for compatibility)."""
        try:
            device = sd.query_devices(index)
            device_dict = dict(device)
            # Check if it's an MME device
            try:
                hostapis = sd.query_hostapis()
                hostapi_name = hostapis[device["hostapi"]]["name"]
                if "MME" not in hostapi_name:
                    logger.warning(f"Device {index} is not an MME device")
            except (IndexError, KeyError):
                logger.warning(f"Could not verify MME status for device {index}")
            return device_dict  # noqa: TRY300
        except Exception as e:
            logger.error(f"Failed to get device info for index {index}: {e}")
            return {}

    @classmethod
    def get_device_index_by_name(cls, name: str) -> int:
        """Get MME device index by name using Windows API."""
        try:
            audio_devices = cls.get_audio_devices()
            for device in audio_devices:
                if device["name"] == name:
                    return int(device["index"])
        except Exception as ex:
            logger.error(f"Failed to get device index by name: {name} {ex}")
        return -1


class AudioController:
    def __init__(
        self,
        input_device_id: int = 0,
        output_device_id: int = 0,
        delay_secs: float = 0,
        sample_rate: int = 44100,
        channels: int = 1,
        frames_per_buffer: int = 1024,
    ) -> None:
        self.input_device_id: int = input_device_id
        self.output_device_id: int = output_device_id
        self.delay_secs: float = delay_secs
        self.sample_rate: int = sample_rate
        self.channels: int = channels
        self.frames_per_buffer: int = frames_per_buffer

        # buffer holds interleaved samples (1D)
        self.buffer_size: int = 0
        self.delay_buffer = np.zeros(self.buffer_size, dtype=np.float32)
        self.buffer_index = 0

        self._buf_lock = threading.Lock()

        self.control_thread: threading.Thread | None = None
        self._stop_event = threading.Event()

        # sounddevice stream
        self._stream: sd.Stream | None = None

    def update_parameters(
        self,
        input_device_id: int,
        output_device_id: int,
        delay_secs: float,
        sample_rate: int = 44100,
        channels: int = 1,
        frames_per_buffer: int = 1024,
    ) -> None:
        self.input_device_id = input_device_id
        self.output_device_id = output_device_id
        self.delay_secs = delay_secs
        self.sample_rate = sample_rate
        self.channels = channels
        self.frames_per_buffer = frames_per_buffer

    def _sd_callback(
        self,
        indata: np.ndarray[Any, Any],
        outdata: np.ndarray[Any, Any],
        frames: int,
        _time_info: sd.CallbackFlags,
        status: sd.CallbackFlags,
    ) -> None:
        """
        sounddevice callback signature:
        indata: numpy array of input samples (float32 in [-1, 1])
        outdata: numpy array to fill with output samples
        frames: number of frames
        """
        try:
            if status:
                logger.debug(f"sounddevice status: {status}")

            # indata is already float32 in [-1, 1]
            input_audio = indata.flatten()

            # Prepare output buffer
            delayed_audio = np.zeros(frames * self.channels, dtype=np.float32)

            # Circular buffer read/write with lock
            with self._buf_lock:
                for i in range(frames * self.channels):
                    delayed_audio[i] = self.delay_buffer[self.buffer_index]
                    # write new sample into buffer
                    self.delay_buffer[self.buffer_index] = input_audio[i]
                    self.buffer_index = (self.buffer_index + 1) % self.buffer_size

            # Fill output buffer
            outdata[:] = delayed_audio.reshape(-1, self.channels)

        except Exception as e:
            logger.exception(f"Error in sounddevice callback: {e}")
            # On error, output silence
            outdata.fill(0)

    def start(self) -> None:
        """
        Start the background thread that opens a sounddevice full-duplex stream and keeps it running.
        """
        # Stop existing thread
        self.stop()

        # buffer holds interleaved samples (1D)
        self.buffer_size = int(self.delay_secs * self.sample_rate * self.channels)
        if self.buffer_size <= 0:
            self.buffer_size = max(1, self.frames_per_buffer * self.channels)
        self.delay_buffer = np.zeros(self.buffer_size, dtype=np.float32)
        self.buffer_index = 0

        # Start delay thread
        self._stop_event.clear()
        self.control_thread = threading.Thread(target=self._delay_loop, daemon=True)
        self.control_thread.start()

    def stop(self, join_timeout: float = 5.0) -> None:
        """
        Stop the background thread and close the sounddevice stream.
        """
        if self.control_thread is not None:
            if not self._stop_event.is_set():
                self._stop_event.set()
            self.control_thread.join(timeout=join_timeout)
            self.control_thread = None

        # Ensure stream is closed
        if self._stream is not None:
            with contextlib.suppress(Exception):
                self._stream.stop()
            with contextlib.suppress(Exception):
                self._stream.close()
            self._stream = None

    def _delay_loop(self) -> None:
        """
        Open a sounddevice full-duplex stream and keep it running until stop event is set.
        If the stream fails, log and retry after a short delay.
        """
        while not self._stop_event.is_set():
            try:
                # Open full-duplex stream with float32 format
                self._stream = sd.Stream(
                    device=(self.input_device_id, self.output_device_id),
                    samplerate=self.sample_rate,
                    channels=self.channels,
                    blocksize=self.frames_per_buffer,
                    dtype=np.float32,
                    callback=self._sd_callback,
                )

                # Start the stream
                self._stream.start()

                # Keep thread alive while stream is active and not requested to stop
                while self._stream.active and not self._stop_event.is_set():
                    time.sleep(0.1)

                # Stop and close stream if loop exits
                with contextlib.suppress(Exception):
                    self._stream.stop()
                with contextlib.suppress(Exception):
                    self._stream.close()
                self._stream = None

            except Exception as e:
                logger.error(f"Error streaming audio with sounddevice: {e}")
                # Clean up partial resources
                with contextlib.suppress(Exception):
                    if self._stream is not None:
                        self._stream.close()
                self._stream = None

            # Backoff before retrying
            time.sleep(0.5)
