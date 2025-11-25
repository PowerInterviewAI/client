from typing import Any

from fastapi import APIRouter

from backend.api.error_handler import RouteErrorHandler
from backend.schemas.app_state import AppState
from backend.services.audio_service import AudioService
from backend.services.config_service import ConfigService
from backend.services.service_status_manager import SETVICE_STATUS_MANAGER
from backend.services.suggestion_service import SUGGESTION_SERVICE
from backend.services.transcript_service import TRANSCRIPT_SERVICE

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
        transcripts=TRANSCRIPT_SERVICE.get_transcripts(),
        running_state=TRANSCRIPT_SERVICE.running_state(),
        suggestions=SUGGESTION_SERVICE.get_suggestions(),
        is_backend_live=SETVICE_STATUS_MANAGER.is_backend_live(),
    )


@router.get("/start")
def start_engine() -> None:
    app_cfg = ConfigService.load_config()
    TRANSCRIPT_SERVICE.start(
        input_device_index=app_cfg.audio_input_device,
        asr_model_name=app_cfg.asr_model,
    )
    SUGGESTION_SERVICE.start_suggestion()


@router.get("/stop")
def stop_engine() -> None:
    TRANSCRIPT_SERVICE.stop()
    SUGGESTION_SERVICE.stop_suggestion()
