from pydantic_settings import BaseSettings


class Config(BaseSettings):
    MAX_SCREENSHOTS: int = 4


config = Config()
