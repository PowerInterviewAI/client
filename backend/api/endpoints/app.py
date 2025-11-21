from typing import Any

from fastapi import APIRouter

from backend.api.custom import RouteErrorHandler
from backend.schemas.app_state import AppState
from backend.services.audio_service import AudioService
from backend.services.config_service import ConfigService
from backend.services.suggestion_service import suggestion_service
from backend.services.transcript_service import transcriptor

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["App Management"],
)


@router.get("/audio-input-devices")
def get_audio_input_devices() -> list[dict[str, Any]]:
    return AudioService.get_input_devices()


@router.get("/audio-output-devices")
def get_audio_output_devices() -> list[dict[str, Any]]:
    return AudioService.get_output_devices()


@router.get("/get-state")
def get_app_state() -> AppState:
    return AppState(
        transcripts=transcriptor.get_transcripts(),
        running_state=transcriptor.running_state(),
        suggestion_state=suggestion_service.suggestion_state(),
        suggestion=suggestion_service.get_suggestion(),
    )


@router.get("/start")
def start_engine() -> None:
    app_state = ConfigService.load_config()
    transcriptor.start(input_device_index=app_state.audio_input_device)


@router.get("/stop")
def stop_engine() -> None:
    transcriptor.stop()
    suggestion_service.stop_suggestion()
