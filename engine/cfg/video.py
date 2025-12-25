from pydantic_settings import BaseSettings


class Config(BaseSettings):
    DEFAULT_WIDTH: int = 1280
    DEFAULT_HEIGHT: int = 720
    DEFAULT_FPS: int = 20


config = Config()
