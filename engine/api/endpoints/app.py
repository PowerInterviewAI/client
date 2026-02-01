from typing import Any

from fastapi import APIRouter, Response

from engine.api.error_handler import RouteErrorHandler
from engine.app import the_app
from engine.models.config import Config, ConfigUpdate
from engine.schemas.app_state import AppState
from engine.services.config_service import ConfigService
from shared.audio_device_service import AudioDeviceService

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["App Management"],
)


@router.get("/get-config")
def get_configuration() -> Config:
    return ConfigService.load_config()


@router.put("/update-config")
def update_configuration(
    cfg: ConfigUpdate,
) -> Config:
    return ConfigService.update_config(cfg=cfg)


@router.get("/audio-input-devices")
def get_audio_input_devices() -> list[dict[str, Any]]:
    return AudioDeviceService.get_input_devices()


@router.get("/audio-output-devices")
def get_audio_output_devices() -> list[dict[str, Any]]:
    return AudioDeviceService.get_output_devices()


@router.get("/get-state")
def get_app_state() -> AppState:
    return the_app.get_app_state()


@router.get("/start-assistant")
def start_assistant() -> None:
    the_app.start_assistant()


@router.get("/stop-assistant")
def stop_assistant() -> None:
    the_app.stop_assistant()


@router.get("/export-transcript")
def export_transcript() -> Response:
    return Response(
        content=the_app.export_transcript(),
        media_type="text/plain",
    )
