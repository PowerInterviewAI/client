from collections import deque
from typing import Any

import numpy as np
import sounddevice as sd
from loguru import logger

from shared.audio_device_service import AudioDeviceService


class AudioController:
    """Processes audio with configurable delay and routes to VBCABLE."""

    def __init__(self, input_device_name: str, delay_ms: float) -> None:
        self.input_device_name = input_device_name
        self.delay_ms = delay_ms
        self.running = False

        # Audio configuration
        self.chunk_size = 1024
        self.sample_rate = 44100
        self.channels = 2
        self.dtype = np.int16

        # Calculate delay buffer size in chunks
        delay_seconds = delay_ms / 1000.0
        self.delay_chunks = int((delay_seconds * self.sample_rate) / self.chunk_size)
        self.delay_buffer: deque[np.ndarray[Any, Any]] = deque(maxlen=max(1, self.delay_chunks))

    def list_devices(self) -> None:
        """List all available audio devices."""
        logger.info("\n=== Available Audio Devices ===")
        devices = AudioDeviceService.get_audio_devices()
        for device in devices:
            device_type = []
            if device["max_input_channels"] > 0:
                device_type.append("INPUT")
            if device["max_output_channels"] > 0:
                device_type.append("OUTPUT")
            logger.info(f"[{device['index']}] {device['name']} ({', '.join(device_type)})")
        logger.info("=" * 50)

    def start(self) -> None:
        """Start audio processing loop."""
        self.running = True

        # Find input device using the service
        input_devices = AudioDeviceService.get_input_devices()
        input_device_index = None
        for device in input_devices:
            if self.input_device_name.lower() in device["name"].lower():
                input_device_index = device["index"]
                break

        if input_device_index is None:
            logger.error(f"Input device '{self.input_device_name}' not found!")
            self.list_devices()
            return

        # Find VBCABLE output device using the service
        output_device_index = AudioDeviceService.get_vb_input_device_index()
        if output_device_index < 0:
            logger.error("VBCABLE output device not found!")
            logger.error("Looking for 'CABLE Input' (VB-Audio Virtual Cable)")
            self.list_devices()
            return

        input_info = AudioDeviceService.get_device_info_by_index(input_device_index)
        output_info = AudioDeviceService.get_device_info_by_index(output_device_index)

        logger.info(f"Input Device: {input_info['name']}")
        logger.info(f"Output Device: {output_info['name']}")
        logger.info(f"Delay: {self.delay_ms}ms ({self.delay_chunks} chunks)")
        logger.info(f"Sample Rate: {self.sample_rate}Hz, Channels: {input_info['max_input_channels']}")
        logger.info("Press Ctrl+C to stop...")

        try:
            # Open input and output streams
            input_stream = sd.InputStream(
                device=input_device_index,
                channels=input_info["max_input_channels"],
                samplerate=self.sample_rate,
                blocksize=self.chunk_size,
                dtype=self.dtype,
            )

            output_stream = sd.OutputStream(
                device=output_device_index,
                channels=1,
                samplerate=self.sample_rate,
                blocksize=self.chunk_size,
                dtype=self.dtype,
            )

            input_stream.start()
            output_stream.start()

            logger.info("Audio processing started...")
            chunk_count = 0

            # Main processing loop
            while self.running:
                # Read audio chunk from input device
                audio_data, _ = input_stream.read(self.chunk_size)

                # Add to delay buffer
                self.delay_buffer.append(audio_data)

                # Output delayed audio if buffer is full
                if len(self.delay_buffer) >= self.delay_chunks:
                    delayed_audio = self.delay_buffer[0]
                    output_stream.write(delayed_audio)
                    chunk_count += 1

                    if chunk_count % 100 == 0:
                        logger.debug(f"Processed {chunk_count} chunks...")

            # Cleanup
            logger.info("Stopping audio streams...")
            input_stream.stop()
            input_stream.close()
            output_stream.stop()
            output_stream.close()

        except Exception as e:
            logger.exception(f"Error during audio processing: {e}")
        finally:
            logger.info("Audio processing stopped.")

    def stop(self) -> None:
        """Stop audio processing."""
        self.running = False

    def cleanup(self) -> None:
        """Clean up resources."""
        # sounddevice doesn't require explicit cleanup
