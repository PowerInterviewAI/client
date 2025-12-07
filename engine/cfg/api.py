from loguru import logger
from pydantic_settings import BaseSettings


class Config(BaseSettings):
    DEBUG: bool = False

    APP_TITLE: str = "Power Interview Backend"
    APP_NAME: str = "Power Interview"
    APP_URL: str = "https://power-interview.onrender.com"
    APP_EMAIL: str = "admin@power-interview.ai"
    APP_PORT: int = 8081


config = Config()
logger.debug(f"Debug mode: {config.DEBUG}")
