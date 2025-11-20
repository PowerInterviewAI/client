from pydantic_settings import BaseSettings


class Config(BaseSettings):
    # BACKEND_URL: str = "https://power-interview-backend.onrender.com/api/ping"
    BACKEND_URL: str = "http://localhost:8080"

    BACKEND_PING_URL: str = f"{BACKEND_URL}/api/ping"
    BACKEND_SUGGESTIONS_URL: str = f"{BACKEND_URL}/api/llm/suggestions"

    HTTP_TIMEOUT: int = 10


config = Config()
