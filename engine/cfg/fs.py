from pathlib import Path


class Config:
    ROOT_DIR: Path = Path(__file__).parent.parent.parent

    ENGINE_DIR: Path = Path(__file__).parent.parent
    MODELS_DIR: Path = ROOT_DIR / "models"

    PUBLIC_DIR: Path = ENGINE_DIR / "public"

    CONFIG_FILE: Path = ROOT_DIR / "config.json"


config = Config()
