from pydantic_settings import BaseSettings


class Config(BaseSettings):
    BACKEND_URL_ONLINE: str = "https://power-interview-backend.onrender.com"
    BACKEND_URL_LOCAL: str = "http://localhost:8080"

    BACKEND_PING_URL: str = f"{BACKEND_URL_LOCAL}/api/ping"
    BACKEND_SUGGESTIONS_URL: str = f"{BACKEND_URL_LOCAL}/api/llm/suggestion"

    HTTP_TIMEOUT: int = 10


config = Config()
