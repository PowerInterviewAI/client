from fastapi import APIRouter

from backend.api.custom import RouteErrorHandler
from backend.schemas.suggestion import Suggestion

router = APIRouter(
    route_class=RouteErrorHandler,
    tags=["LLM Service"],
)


@router.post("/generate-suggestions")
def generate_suggestions() -> list[Suggestion]:
    return []
