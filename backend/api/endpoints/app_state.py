from typing import Any

from fastapi import APIRouter

from backend.api.custom import RouteErrorHandler
from backend.models.app_state import AppState, AppStateUpdate
from backend.schemas.transcript import Speaker, Transcript
from backend.services.app_config_service import AppStateService
from backend.services.audio_service import AudioService
from backend.utils.rand import RandUtil

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
    count = RandUtil.get_int(5, 10)
    return [
        Transcript(
            speaker=RandUtil.get_enum(Speaker),
            text=RandUtil.get_str(),
            timestamp=RandUtil.get_timestamp(),
        )
        for _ in range(count)
    ]
