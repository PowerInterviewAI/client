from fastapi import APIRouter

from backend.api.custom import RouteErrorHandler
from backend.models.config import Config, ConfigUpdate
from backend.schemas.app_state import RunningState
from backend.services.config_service import ConfigService
from backend.services.transcript_service import transcriptor

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["App Configuration Management"],
)


@router.get("/get")
def get_configuration() -> Config:
    return ConfigService.load_config()


@router.put("/update")
def update_configuration(
    cfg: ConfigUpdate,
) -> Config:
    def on_input_device_change(input_device_index: int) -> None:
        if input_device_index is not None and transcriptor.running_state() == RunningState.RUNNING:
            transcriptor.start(input_device_index)

    return ConfigService.update_config(
        cfg=cfg,
        callback_on_audio_input_device_change=on_input_device_change,
    )
