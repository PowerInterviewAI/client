from fastapi import APIRouter

from backend.api.custom import RouteErrorHandler

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["LLM Service"],
)


@router.post("/generate-suggestions")
def generate_suggestions() -> str:
    return "OK"
