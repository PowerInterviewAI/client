from loguru import logger
from pydantic_settings import BaseSettings

from engine.utils.env import EnvUtil


class Config(BaseSettings):
    IS_DEBUG: bool = False
    IS_TEST: bool = EnvUtil.is_test()

    APP_TITLE: str = "Power Interview Backend"
    APP_NAME: str = "Power Interview"
    APP_URL: str = "https://power-interview.onrender.com"
    APP_EMAIL: str = "admin@power-interview.ai"
    APP_PORT: int = 8081


config = Config()
logger.debug(f"Is Debug: {config.IS_DEBUG}")
logger.debug(f"Is Test: {config.IS_TEST}")
