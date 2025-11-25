from enum import StrEnum

from fastapi import APIRouter

from app.api.endpoints.app import router as router_app
from app.api.endpoints.config import router as router_config
from app.api.endpoints.ping import router as router_ping
from app.api.endpoints.webrtc import router as router_webrtc
from app.api.error_handler import RouteErrorHandler

router = APIRouter(route_class=RouteErrorHandler)


class RouterPrefix(StrEnum):
    PING = "/ping"
    CONFIG = "/config"
    APP = "/app"
    WEBRTC = "/webrtc"


router.include_router(router=router_ping, prefix=RouterPrefix.PING.value)
router.include_router(router=router_config, prefix=RouterPrefix.CONFIG.value)
router.include_router(router=router_app, prefix=RouterPrefix.APP.value)
router.include_router(router=router_webrtc, prefix=RouterPrefix.WEBRTC.value)
