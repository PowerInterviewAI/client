from collections.abc import Callable, Coroutine
from typing import Any

import requests
from fastapi import HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute
from loguru import logger

from engine.cfg.api import config as cfg_api
from engine.schemas.error import ErrorCode422, ErrorCode500, InternalServerException, ValidationErrorException


class RouteErrorHandler(APIRoute):
    """Custom APIRoute that handles application errors and exceptions"""

    def get_route_handler(self) -> Callable[[Request], Coroutine[Any, Any, Response]]:
        original_route_handler = super().get_route_handler()

        async def custom_route_handler(request: Request) -> Response:
            try:
                return await original_route_handler(request)
            except RequestValidationError:
                if cfg_api.IS_DEBUG:
                    logger.exception("RequestValidationError")
                raise
            except HTTPException:
                if cfg_api.IS_DEBUG:
                    logger.exception("HTTPException")
                raise
            except (ValueError, TypeError) as ex:
                if cfg_api.IS_DEBUG:
                    logger.exception(f"ValidationError due to: {ex}")
                raise ValidationErrorException(
                    error_code=ErrorCode422.VALIDATION_ERROR,
                    message=f"{ex}",
                ) from ex
            except Exception as ex:
                logger.exception("Unhandled exception:")
                raise InternalServerException(
                    error_code=ErrorCode500.INTERNAL_SERVER_ERROR,
                    message=f"{ex}",
                ) from ex

        return custom_route_handler


def raise_for_status(resp: requests.Response) -> None:
    """Raise HTTPException for non-2xx responses"""
    try:
        resp.raise_for_status()
    except Exception as ex:
        resp_json = resp.json()
        error_detail = resp_json.get("detail", {})
        if "error_code" in error_detail and "message" in error_detail:
            raise HTTPException(
                status_code=resp.status_code,
                detail=error_detail,
            ) from ex

        raise HTTPException(
            status_code=resp.status_code,
            detail={"error_code": "HTTP_ERROR", "message": f"HTTP error {resp.status_code}"},
        ) from ex
