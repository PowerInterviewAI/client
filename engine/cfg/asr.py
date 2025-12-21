class Config:
    SILENCE_INTERVAL_SECONDS: float = 10.0  # seconds
    SILENCE_FRAME: bytes = b"\x00" * 320  # 20 ms @ 16kHz PCM16


config = Config()
