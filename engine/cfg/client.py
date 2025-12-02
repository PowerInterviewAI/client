from pydantic_settings import BaseSettings


class Config(BaseSettings):
    BACKEND_URL_ONLINE: str = "https://power-interview-backend.onrender.com"
    BACKEND_URL_LOCAL: str = "http://localhost:8080"
    BACKEND_URL: str = BACKEND_URL_ONLINE

    BACKEND_PING_URL: str = f"{BACKEND_URL}/api/ping"
    BACKEND_PUNCTUATION_URL: str = f"{BACKEND_URL}/api/llm/punctuation"
    BACKEND_SUGGESTIONS_URL: str = f"{BACKEND_URL}/api/llm/suggestion"
    BACKEND_WEBRTC_OFFER_URL: str = f"{BACKEND_URL}/api/webrtc/offer"

    BACKEND_ASR_STREAMING_URL: str = f"{BACKEND_URL}/api/asr/streaming"

    HTTP_TIMEOUT: int = 10


config = Config()
