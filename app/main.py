import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.endpint_filter import EndpointFilter
from app.api.router import router as api_router
from app.cfg.api import config as cfg_api
from app.cfg.fs import config as cfg_fs
from app.init import init_backend_ping, init_config, init_virtual_camera_loop

# Create FastAPI instance
app = FastAPI(
    debug=cfg_api.DEBUG,
    title=cfg_api.APP_TITLE,
    contact={
        "name": cfg_api.APP_NAME,
        "url": str(cfg_api.APP_URL),
        "email": str(cfg_api.APP_EMAIL),
    },
    on_startup=[
        init_config,
        init_backend_ping,
        init_virtual_camera_loop,
    ],
)

# Add middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router, prefix="/api")

# Mound static files
app.mount("/", StaticFiles(directory=cfg_fs.PUBLIC_DIR, html=True), name="public")

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


if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        reload=cfg_api.DEBUG,
        host="0.0.0.0",  # noqa: S104
        port=cfg_api.APP_PORT,
    )
