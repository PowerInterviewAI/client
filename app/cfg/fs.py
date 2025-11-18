from pathlib import Path


class Config:
    ROOT_DIR: Path = Path(__file__).parent.parent.parent
    MODELS_DIR: Path = ROOT_DIR / "models"


config = Config()
