from enum import StrEnum

from fastapi import APIRouter

from backend.api.endpoints.app import router as router_app
from backend.api.endpoints.config import router as router_config
from backend.api.endpoints.ping import router as router_ping
from backend.api.endpoints.webrtc import router as router_webrtc
from backend.api.error_handler import RouteErrorHandler

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
