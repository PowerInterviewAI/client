from fastapi import APIRouter

from engine.api.error_handler import RouteErrorHandler

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["Ping Check"],
)


@router.get("/ping")
def healthcheck() -> str:
    return "OK"
