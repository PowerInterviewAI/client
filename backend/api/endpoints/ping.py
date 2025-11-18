from fastapi import APIRouter

from backend.api.custom import RouteErrorHandler

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["Ping Check"],
)


@router.get("/")
def healthcheck() -> str:
    return "OK"
