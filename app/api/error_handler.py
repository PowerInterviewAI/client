from collections.abc import Callable, Coroutine
from typing import Any

from fastapi import HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from loguru import logger

from app.cfg.api import config as cfg_api
from app.schemas.error import ErrorCode500, InternalServerException


class RouteErrorHandler(APIRoute):
    """Custom APIRoute that handles application errors and exceptions"""

    def get_route_handler(self) -> Callable[[Request], Coroutine[Any, Any, Response]]:
        original_route_handler = super().get_route_handler()

        async def custom_route_handler(request: Request) -> Response:
            try:
                return await original_route_handler(request)
            except RequestValidationError:
                if cfg_api.DEBUG:
                    logger.exception("RequestValidationError")
                raise
            except HTTPException:
                if cfg_api.DEBUG:
                    logger.exception("HTTPException")
                raise
            except (ValueError, TypeError) as ex:
                if cfg_api.DEBUG:
                    logger.exception(f"ValidationError due to: {ex}")
                raise RequestValidationError(
                    errors=[
                        {
                            "loc": ("body",),
                            "msg": f"Validation error: {ex}",
                            "type": "value_error",
                        }
                    ]
                ) from ex
            except Exception as ex:
                logger.exception("Unhandled exception:")
                raise InternalServerException(
                    error_code=ErrorCode500.INTERNAL_SERVER_ERROR,
                    message="Internal server error",
                ) from ex

        return custom_route_handler
