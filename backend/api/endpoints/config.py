from fastapi import APIRouter

from backend.api.error_handler import RouteErrorHandler
from backend.models.config import Config, ConfigUpdate
from backend.services.config_service import ConfigService
from backend.services.virtual_camera import VIRTUAL_CAMERA_SERVICE

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
    return ConfigService.update_config(
        cfg=cfg,
        callbacks=[
            VIRTUAL_CAMERA_SERVICE.update_parameters_from_config,
        ],
    )
