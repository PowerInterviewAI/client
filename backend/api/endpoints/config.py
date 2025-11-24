from fastapi import APIRouter

from backend.api.error_handler import RouteErrorHandler
from backend.models.config import Config, ConfigUpdate
from backend.services.config_service import ConfigService

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
    return ConfigService.update_config(cfg=cfg)
