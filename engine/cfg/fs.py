from pathlib import Path


class Config:
    ROOT_DIR: Path = Path(__file__).parent.parent.parent

    ENGINE_DIR: Path = Path(__file__).parent.parent

    PUBLIC_DIR: Path = ENGINE_DIR / "public"

    APP_DATA_DIR: Path = Path.home() / ".power-interview"
    CONFIG_FILE: Path = APP_DATA_DIR / "config.json"

    @classmethod
    def ensure_dirs(cls) -> None:
        cls.APP_DATA_DIR.mkdir(parents=True, exist_ok=True)


Config.ensure_dirs()

config = Config()
