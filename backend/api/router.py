from enum import StrEnum

from fastapi import APIRouter

from backend.api.custom import RouteErrorHandler
from backend.api.endpoints.app_state import router as router_app_state
from backend.api.endpoints.llm import router as router_llm
from backend.api.endpoints.ping import router as router_ping

router = APIRouter(route_class=RouteErrorHandler)


class RouterPrefix(StrEnum):
    PING = "/ping"
    APP_STATE = "/app-state"
    LLM = "/llm"


router.include_router(router=router_ping, prefix=RouterPrefix.PING.value)
router.include_router(router=router_app_state, prefix=RouterPrefix.APP_STATE.value)
router.include_router(router=router_llm, prefix=RouterPrefix.LLM.value)
