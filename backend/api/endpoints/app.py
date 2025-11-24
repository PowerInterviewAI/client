from typing import Any

from fastapi import APIRouter

from backend.api.error_handler import RouteErrorHandler
from backend.schemas.app_state import AppState
from backend.services.audio_service import AudioService
from backend.services.config_service import ConfigService
from backend.services.service_status_manager import service_status_manager
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
        suggestions=suggestion_service.get_suggestions(),
        is_backend_live=service_status_manager.is_backend_live(),
    )


@router.get("/start")
def start_engine() -> None:
    app_cfg = ConfigService.load_config()
    transcriptor.start(
        input_device_index=app_cfg.audio_input_device,
        asr_model_name=app_cfg.asr_model,
    )
    suggestion_service.start_suggestion()


@router.get("/stop")
def stop_engine() -> None:
    transcriptor.stop()
    suggestion_service.stop_suggestion()
