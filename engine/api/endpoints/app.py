from typing import Any

from fastapi import APIRouter

from engine.api.error_handler import RouteErrorHandler
from engine.app import the_app
from engine.models.config import Config, ConfigUpdate
from engine.schemas.app_state import AppState
from engine.services.audio_service import AudioService

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
async def get_app_state() -> AppState:
    return await the_app.get_app_state()


@router.get("/start-assistant")
async def start_assistant() -> None:
    await the_app.start_assistant()


@router.get("/stop-assistant")
async def stop_assistant() -> None:
    await the_app.stop_assistant()


@router.get("/export-transcript")
async def export_transcript() -> str:
    return await the_app.export_transcript()
