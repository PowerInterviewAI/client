from pathlib import Path


class Config:
    ROOT_DIR: Path = Path(__file__).parent.parent.parent
    BACKEND_DIR: Path = ROOT_DIR / "backend"
    MODELS_DIR: Path = ROOT_DIR / "models"

    PUBLIC_DIR: Path = BACKEND_DIR / "public"

    APP_STATE_FILE: Path = ROOT_DIR / "app_state.json"


config = Config()
