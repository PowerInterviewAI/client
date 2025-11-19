from typing import Any

from fastapi import APIRouter

from backend.api.custom import RouteErrorHandler
from backend.models.app_state import AppState, AppStateUpdate
from backend.schemas.running_state import RunningState
from backend.schemas.transcript import Transcript
from backend.services.app_config_service import AppStateService
from backend.services.audio_service import AudioService
from backend.services.transcript_service import transcriptor

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["App Configuration Management"],
)


@router.get("/get-app-state")
def get_app_state() -> AppState:
    return AppStateService.load_app_state()


@router.put("/update-app-state")
def update_app_state(
    cfg: AppStateUpdate,
) -> AppState:
    return AppStateService.update_app_state(cfg)


@router.get("/audio-input-devices")
def list_audio_input_devices() -> list[dict[str, Any]]:
    return AudioService.get_input_devices()


@router.get("/audio-output-devices")
def list_audio_output_devices() -> list[dict[str, Any]]:
    return AudioService.get_output_devices()


@router.get("/get-transcriptions")
def get_transcriptions() -> list[Transcript]:
    return transcriptor.get_transcripts()


@router.get("/running-state")
def is_running() -> RunningState:
    return transcriptor.running_state()


@router.get("/start")
def start() -> None:
    app_state = AppStateService.get_app_state()
    transcriptor.start(input_device_index=app_state.audio_input_device)


@router.get("/stop")
def stop() -> None:
    transcriptor.stop()
