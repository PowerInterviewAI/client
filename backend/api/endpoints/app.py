from fastapi import APIRouter

from backend.api.custom import RouteErrorHandler
from backend.schemas.app_state import AppState
from backend.schemas.suggestion import SuggestionState
from backend.services.audio_service import AudioService
from backend.services.config_service import ConfigService
from backend.services.transcript_service import transcriptor

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["App Management"],
)


@router.get("/get-state")
def get_app_state() -> AppState:
    return AppState(
        audio_input_devices=AudioService.get_input_devices(),
        audio_output_devices=AudioService.get_output_devices(),
        transcripts=transcriptor.get_transcripts(),
        running_state=transcriptor.running_state(),
        suggestion_state=SuggestionState.IDLE,
        suggestions=[],
    )


@router.get("/start")
def start_engine() -> None:
    app_state = ConfigService.load_config()
    transcriptor.start(input_device_index=app_state.audio_input_device)


@router.get("/stop")
def stop_engine() -> None:
    transcriptor.stop()
