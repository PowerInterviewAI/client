from enum import StrEnum

from fastapi import APIRouter

from engine.api.endpoints.app import router as router_app
from engine.api.endpoints.ping import router as router_ping
from engine.api.endpoints.webrtc import router as router_webrtc
from engine.api.error_handler import RouteErrorHandler

router = APIRouter(route_class=RouteErrorHandler)


class RouterPrefix(StrEnum):
    PING = "/ping"
    APP = "/app"
    WEBRTC = "/webrtc"


router.include_router(router=router_ping, prefix=RouterPrefix.PING.value)
router.include_router(router=router_app, prefix=RouterPrefix.APP.value)
router.include_router(router=router_webrtc, prefix=RouterPrefix.WEBRTC.value)
