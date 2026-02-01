import json

from loguru import logger

from shared.audio_device_service import AudioDeviceService


def test_vb_input_devices() -> None:
    vb_input_device = AudioDeviceService.get_vb_input_device()
    assert vb_input_device, "VB-Audio Virtual Input device not found"
    logger.debug(f"VB-Audio Virtual Input device: {json.dumps(vb_input_device, indent=2)}")

    vb_input_index = AudioDeviceService.get_vb_input_device_index()
    assert vb_input_index != -1, "VB-Audio Virtual Input device not found"
    logger.debug(f"VB-Audio Virtual Input device index: {vb_input_index}")


def test_vb_output_devices() -> None:
    vb_output_device = AudioDeviceService.get_vb_output_device()
    assert vb_output_device, "VB-Audio Virtual Output device not found"
    logger.debug(f"VB-Audio Virtual Output device: {json.dumps(vb_output_device, indent=2)}")

    vb_output_index = AudioDeviceService.get_vb_output_device_index()
    assert vb_output_index != -1, "VB-Audio Virtual Output device not found"
    logger.debug(f"VB-Audio Virtual Output device index: {vb_output_index}")
