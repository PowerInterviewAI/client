from fastapi import APIRouter

from engine.api.error_handler import RouteErrorHandler, raise_for_status
from engine.app import the_app
from engine.cfg.auth import config as cfg_auth
from engine.cfg.client import config as cfg_client
from engine.models.config import ConfigUpdate
from engine.schemas.auth import AuthRequest, ChangePasswordRequest, LoginRequestBackend
from engine.schemas.error import ErrorCode401, UnauthorizedException
from engine.services.device_service import DeviceService

router = APIRouter(route_class=RouteErrorHandler, tags=["Authentication"])


@router.post("/login")
async def login(req: AuthRequest) -> None:
    # Check credentials
    if not req.email or not req.password:
        raise UnauthorizedException(
            error_code=ErrorCode401.INVALID_CREDENTIALS,
            message="Invalid credentials",
        )

    # Authenticate user to backend
    async with (await the_app.get_session()).post(
        cfg_client.BACKEND_AUTH_LOGIN_URL,
        json=LoginRequestBackend(
            email=req.email,
            password=req.password,
            device_info=DeviceService.get_device_info(),
        ).model_dump(),
    ) as resp:
        await raise_for_status(resp)

        # Get session token from set cookie
        cookies = resp.cookies
        if cfg_auth.SESSION_TOKEN_COOKIE_NAME not in cookies:
            raise UnauthorizedException(
                error_code=ErrorCode401.INVALID_CREDENTIALS,
                message="Invalid credentials",
            )
        session_token = cookies[cfg_auth.SESSION_TOKEN_COOKIE_NAME].value

        # Update app config with session token
        the_app.update_config(
            cfg=ConfigUpdate(
                session_token=session_token,
            )
        )

        # Update login status
        await the_app.service_monitor.set_logged_in(True)


@router.post("/signup")
async def signup(req: AuthRequest) -> None:
    # Check credentials
    if not req.email or not req.password:
        raise UnauthorizedException(
            error_code=ErrorCode401.INVALID_CREDENTIALS,
            message="Invalid credentials",
        )

    # Register user to backend
    async with (await the_app.get_session()).post(
        cfg_client.BACKEND_AUTH_SIGNUP_URL,
        json=AuthRequest(
            email=req.email,
            password=req.password,
        ).model_dump(),
    ) as resp:
        await raise_for_status(resp)


@router.get("/logout")
async def logout() -> None:
    # Update login status
    await the_app.service_monitor.set_logged_in(False)

    # Clear session token in app config
    the_app.update_config(
        cfg=ConfigUpdate(
            session_token="",
        )
    )

    # Notify backend about logout
    async with (await the_app.get_session()).get(cfg_client.BACKEND_AUTH_LOGOUT_URL) as resp:
        await raise_for_status(resp)


@router.post("/change-password")
async def change_password(req: ChangePasswordRequest) -> None:
    # Validate request
    if not req.current_password or not req.new_password:
        raise UnauthorizedException(
            error_code=ErrorCode401.INVALID_CREDENTIALS,
            message="Current password and new password are required",
        )

    # Change password via backend
    async with (await the_app.get_session()).post(
        cfg_client.BACKEND_AUTH_CHANGE_PASSWORD_URL,
        json=req.model_dump(),
    ) as resp:
        await raise_for_status(resp)
