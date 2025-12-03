import argparse
import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from engine.api.endpint_filter import EndpointFilter
from engine.api.router import router as api_router
from engine.cfg.api import config as cfg_api
from engine.cfg.fs import config as cfg_fs
from engine.init import init_app

# Create FastAPI instance
api = FastAPI(
    debug=cfg_api.DEBUG,
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

# Mound static files
api.mount("/", StaticFiles(directory=cfg_fs.PUBLIC_DIR, html=True), name="public")

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


def parse_args() -> argparse.Namespace:
    """Read CLI arguments safely for Python and packaged executables."""
    parser = argparse.ArgumentParser(description="Power Interview Local Backend")

    parser.add_argument(
        "--port",
        type=int,
        default=cfg_api.APP_PORT,
        help=f"Port to run server (default: {cfg_api.APP_PORT})",
    )

    parser.add_argument(
        "--host",
        type=str,
        default="0.0.0.0",  # noqa: S104
        help="Host address (default: 0.0.0.0)",
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    uvicorn.run(
        "engine.main:api",
        reload=cfg_api.DEBUG,
        host=args.host,
        port=args.port,
    )
