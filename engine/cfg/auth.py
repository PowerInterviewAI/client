from pydantic_settings import BaseSettings


class Config(BaseSettings):
    SESSION_TOKEN_COOKIE_NAME: str = "session_token"  # noqa: S105


config = Config()
