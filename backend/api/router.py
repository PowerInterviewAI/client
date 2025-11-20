from enum import StrEnum

from fastapi import APIRouter

from backend.api.custom import RouteErrorHandler
from backend.api.endpoints.app import router as router_app
from backend.api.endpoints.config import router as router_config
from backend.api.endpoints.ping import router as router_ping

router = APIRouter(route_class=RouteErrorHandler)


class RouterPrefix(StrEnum):
    CONFIG = "/config"
    APP = "/app"
    PING = "/ping"


router.include_router(router=router_config, prefix=RouterPrefix.CONFIG.value)
router.include_router(router=router_app, prefix=RouterPrefix.APP.value)
router.include_router(router=router_ping, prefix=RouterPrefix.PING.value)
