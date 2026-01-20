import argparse
import logging
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from loguru import logger

from engine.api.endpint_filter import EndpointFilter
from engine.api.router import router as api_router
from engine.cfg.api import config as cfg_api
from engine.cfg.fs import config as cfg_fs
from engine.init import init_app, init_watch_parent

# Create FastAPI instance
api = FastAPI(
    debug=cfg_api.IS_DEBUG,
    title=cfg_api.APP_TITLE,
    contact={
        "name": cfg_api.APP_NAME,
        "url": str(cfg_api.APP_URL),
        "email": str(cfg_api.APP_EMAIL),
    },
    on_startup=[
        init_app,
    ],
)

# Add middlewares
api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
api.include_router(api_router, prefix="/api")


# Serve SPA with fallback to index.html
@api.get("/{path:path}", response_model=None)
def serve_spa(path: str) -> FileResponse | RedirectResponse | JSONResponse:
    file_path = Path(cfg_fs.PUBLIC_DIR) / path
    if file_path.exists():
        if file_path.is_file():
            return FileResponse(file_path)
        if file_path.is_dir():
            # Fallback - Redirect to index.html for client-side routing
            return RedirectResponse(url=f"/{path.strip('/')}/index.html")
    # If no index.html, return 404 (shouldn't happen)
    return JSONResponse(content={"error": "File not found"}, status_code=404)


# Configure logging
logging.getLogger("uvicorn.access").addFilter(
    EndpointFilter(
        [
            "/api/app/get-state",
            "/api/app/audio-input-devices",
            "/api/app/audio-output-devices",
        ]
    )
)


def str2bool(v: str) -> bool:
    if isinstance(v, bool):
        return v
    if v.lower() in ("yes", "true", "t", "y", "1"):
        return True
    if v.lower() in ("no", "false", "f", "n", "0"):
        return False

    msg = "Boolean value expected."
    raise argparse.ArgumentTypeError(msg)


def parse_args() -> argparse.Namespace:
    """Read CLI arguments safely for Python and packaged executables."""
    parser = argparse.ArgumentParser(description="Power Interview Local Engine")

    parser.add_argument(
        "--port",
        type=int,
        default=cfg_api.APP_PORT,
        help=f"Port to run engine (default: {cfg_api.APP_PORT})",
    )

    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",  # noqa: S104
        help="Host address (default: 0.0.0.0)",
    )

    parser.add_argument(
        "--reload",
        type=str2bool,
        default=True,
        help="Reload on file changes (default: True)",
    )

    parser.add_argument(
        "--watch-parent",
        type=str2bool,
        dest="watch_parent",
        default=False,
        help="Watch parent process (default: False)",
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    if args.watch_parent:
        init_watch_parent()

    logger.debug(f"Args: {args}")

    uvicorn.run(
        "engine.main:api",
        reload=args.reload and cfg_api.IS_DEBUG,
        host=args.host,
        port=args.port,
    )
