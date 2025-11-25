from pathlib import Path


class Config:
    ROOT_DIR: Path = Path(__file__).parent.parent.parent
    APP_DIR: Path = ROOT_DIR / "app"
    MODELS_DIR: Path = ROOT_DIR / "models"

    PUBLIC_DIR: Path = APP_DIR / "public"

    CONFIG_FILE: Path = ROOT_DIR / "config.json"


config = Config()
