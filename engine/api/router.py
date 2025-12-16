from enum import StrEnum

from fastapi import APIRouter

from engine.api.endpoints.app import router as router_app
from engine.api.endpoints.auth import router as router_auth
from engine.api.endpoints.ping import router as router_ping
from engine.api.endpoints.video import router as router_video
from engine.api.error_handler import RouteErrorHandler

router = APIRouter(route_class=RouteErrorHandler)


class RouterPrefix(StrEnum):
    AUTH = "/auth"
    PING = "/ping"
    APP = "/app"
    VIDEO = "/video"


router.include_router(router=router_auth, prefix=RouterPrefix.AUTH.value)
router.include_router(router=router_ping, prefix=RouterPrefix.PING.value)
router.include_router(router=router_app, prefix=RouterPrefix.APP.value)
router.include_router(router=router_video, prefix=RouterPrefix.VIDEO.value)
