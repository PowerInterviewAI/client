from loguru import logger
from pydantic_settings import BaseSettings

from engine.cfg.api import config as cfg_api


class Config(BaseSettings):
    BACKEND_URL_ONLINE: str = "https://power-interview-backend.onrender.com"
    BACKEND_URL_LOCAL: str = "http://localhost:8080"
    BACKEND_URL: str = BACKEND_URL_LOCAL if cfg_api.IS_DEBUG or cfg_api.IS_TEST else BACKEND_URL_ONLINE

    BACKEND_PING_URL: str = f"{BACKEND_URL}/api/health-check/ping"
    BACKEND_PING_CLIENT_URL: str = f"{BACKEND_URL}/api/health-check/ping-client"
    BACKEND_PING_GPU_SERVER_URL: str = f"{BACKEND_URL}/api/health-check/ping-gpu-server"
    BACKEND_WAKEUP_GPU_SERVER_URL: str = f"{BACKEND_URL}/api/health-check/wakeup-gpu-server"

    BACKEND_AUTH_SIGNUP_URL: str = f"{BACKEND_URL}/api/auth/signup"
    BACKEND_AUTH_LOGIN_URL: str = f"{BACKEND_URL}/api/auth/login"
    BACKEND_AUTH_LOGOUT_URL: str = f"{BACKEND_URL}/api/auth/logout"
    BACKEND_AUTH_CHANGE_PASSWORD_URL: str = f"{BACKEND_URL}/api/auth/change-password"

    BACKEND_REPLY_SUGGESTIONS_URL: str = f"{BACKEND_URL}/api/llm/reply-suggestion"
    BACKEND_CODE_SUGGESTIONS_URL: str = f"{BACKEND_URL}/api/llm/code-suggestion"
    BACKEND_SUMMARIZE_URL: str = f"{BACKEND_URL}/api/llm/summarize"

    BACKEND_WEBRTC_OFFER_URL: str = f"{BACKEND_URL}/api/webrtc/offer"

    BACKEND_ASR_STREAMING_URL: str = (
        f"{BACKEND_URL.replace('http://', 'ws://').replace('https://', 'wss://')}/api/asr/streaming"
    )

    HTTP_TIMEOUT_SECS: int = 15


config = Config()
logger.debug(f"Backend URL: {config.BACKEND_URL}")
