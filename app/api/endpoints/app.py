from typing import Any

from fastapi import APIRouter

from app.api.error_handler import RouteErrorHandler
from app.app import the_app
from app.models.config import Config, ConfigUpdate
from app.schemas.app_state import AppState
from app.services.audio_service import AudioService

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["App Management"],
)


@router.get("/get-config")
def get_configuration() -> Config:
    return the_app.load_config()


@router.put("/update-config")
def update_configuration(
    cfg: ConfigUpdate,
) -> Config:
    return the_app.update_config(cfg=cfg)


@router.get("/audio-input-devices")
def get_audio_input_devices() -> list[dict[str, Any]]:
    return AudioService.get_input_devices()


@router.get("/audio-output-devices")
def get_audio_output_devices() -> list[dict[str, Any]]:
    return AudioService.get_output_devices()


@router.get("/get-state")
def get_app_state() -> AppState:
    return the_app.get_app_state()


@router.get("/start-assistant")
def start_assistant() -> None:
    the_app.start_assistant()


@router.get("/stop-assistant")
def stop_assistant() -> None:
    the_app.stop_assistant()
