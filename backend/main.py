import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.router import router as api_router
from backend.cfg.api import config as cfg_api
from backend.cfg.fs import config as cfg_fs
from backend.init import init_config

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


if __name__ == "__main__":
    uvicorn.run(
        "backend.main:app",
        reload=cfg_api.DEBUG,
        host="0.0.0.0",  # noqa: S104
        port=cfg_api.APP_PORT,
    )
