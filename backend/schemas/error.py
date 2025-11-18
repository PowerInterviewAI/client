from enum import StrEnum
from typing import Annotated, Any

from fastapi import HTTPException, status
from pydantic import BaseModel, Field


class ErrorCode401(StrEnum):
    MISSING_CREDENTIALS = "MISSING_CREDENTIALS"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    INVALID_TOKEN = "INVALID_TOKEN"  # noqa: S105
    INACTIVE_USER = "INACTIVE_USER"


class ErrorCode403(StrEnum):
    PERMISSION_DENIED = "PERMISSION_DENIED"


class ErrorCode404(StrEnum):
    NOT_FOUND = "NOT_FOUND"


class ErrorCode409(StrEnum):
    CONFLICT = "CONFLICT"


class ErrorCode429(StrEnum):
    TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS"


class ErrorCode500(StrEnum):
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"


class GenericErrorDetail[ErrorCode: StrEnum](BaseModel):
    error_code: Annotated[ErrorCode, Field(description="Error code")]
    message: Annotated[str, Field(description="Error message")]
    data: Annotated[dict[str, Any] | None, Field(description="Error data")] = None


class GenericException[ErrorCode: StrEnum](HTTPException):
    error_code_type: type[StrEnum]
    status_code: int
    default_error_code: ErrorCode
    default_message: str
    default_data: dict[str, Any] | None = None

    def __init__(self, error_code: ErrorCode, message: str) -> None:
        super().__init__(
            status_code=self.status_code,
            detail=GenericErrorDetail[ErrorCode](
                error_code=error_code,
                message=message,
            ).model_dump(mode="json"),
        )

    @classmethod
    def get_response(
        cls,
        error_code: ErrorCode | None = None,
        message: str | None = None,
        data: dict[str, Any] | None = None,
    ) -> dict[int | str, Any]:
        return {
            cls.status_code: {
                "model": GenericErrorDetail[cls.error_code_type],  # type: ignore  # noqa: PGH003
                "content": {
                    "application/json": {
                        "example": GenericErrorDetail[cls.error_code_type](  # type: ignore  # noqa: PGH003
                            error_code=error_code or cls.default_error_code,
                            message=message or cls.default_message,
                            data=data or cls.default_data,
                        )
                    }
                },
            }
        }


class UnauthorizedException(GenericException[ErrorCode401]):
    error_code_type = ErrorCode401
    status_code = status.HTTP_401_UNAUTHORIZED
    default_error_code = ErrorCode401.INVALID_CREDENTIALS
    default_message = "Invalid credentials"


class ForbiddenException(GenericException[ErrorCode403]):
    error_code_type = ErrorCode403
    status_code = status.HTTP_403_FORBIDDEN
    default_error_code = ErrorCode403.PERMISSION_DENIED
    default_message = "Not enough permissions"


class NotFoundException(GenericException[ErrorCode404]):
    error_code_type = ErrorCode404
    status_code = status.HTTP_404_NOT_FOUND
    default_error_code = ErrorCode404.NOT_FOUND
    default_message = "Item not found"


class ConflictException(GenericException[ErrorCode409]):
    error_code_type = ErrorCode409
    status_code = status.HTTP_409_CONFLICT
    default_error_code = ErrorCode409.CONFLICT
    default_message = "Item already exists"


class TooManyRequestException(GenericException[ErrorCode429]):
    error_code_type = ErrorCode429
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_error_code = ErrorCode429.TOO_MANY_REQUESTS
    default_message = "Rate limit exceeded"


class InternalServerException(GenericException[ErrorCode500]):
    error_code_type = ErrorCode500
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_error_code = ErrorCode500.INTERNAL_SERVER_ERROR
    default_message = "Internal server error"
