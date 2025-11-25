from fastapi import APIRouter

from app.api.error_handler import RouteErrorHandler

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["Ping Check"],
)


@router.get("/")
def healthcheck() -> str:
    return "OK"
