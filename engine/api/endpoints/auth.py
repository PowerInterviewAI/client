from typing import Any

from fastapi import APIRouter, HTTPException

from engine.api.error_handler import RouteErrorHandler
from engine.app import the_app
from engine.schemas.auth import AuthRequest

router = APIRouter(route_class=RouteErrorHandler, tags=["Authentication"])


@router.post("/login")
async def login(req: AuthRequest) -> dict[str, Any]:
    # NOTE: This is a minimal placeholder implementation.
    # In a real app you should verify credentials against a user store,
    # hash passwords, and issue secure session tokens/HTTPOnly cookies.
    if not req.email or not req.password:
        raise HTTPException(status_code=400, detail="Missing credentials")

    # For demo: accept any non-empty password as valid
    await the_app.service_status_monitor.set_logged_in(True)

    # Optionally store the user email in config/profile for display
    the_app.config.profile.username = req.email
    the_app.save_config()

    return {"status": "ok"}


@router.post("/signup")
async def signup(req: AuthRequest) -> dict[str, Any]:
    # NOTE: Minimal placeholder - does not persist credentials securely.
    if not req.email or not req.password:
        raise HTTPException(status_code=400, detail="Missing credentials")

    # Store user email into profile (no password management here)
    the_app.config.profile.username = req.email
    the_app.save_config()

    return {"status": "created"}


@router.post("/logout")
async def logout() -> dict[str, Any]:
    await the_app.service_status_monitor.set_logged_in(False)
    return {"status": "ok"}
