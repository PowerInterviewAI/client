from pathlib import Path


class Config:
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    ENGINE_DIR = PROJECT_ROOT / "engine"
    UI_DIR = PROJECT_ROOT / "ui"
    ELECTRON_DIR = PROJECT_ROOT / "app"

    UI_EXPORT_DIR = ENGINE_DIR / "public"

    ENGINE_MAIN = ENGINE_DIR / "main.py"
    ENGINE_OUTPUT_DIR = ELECTRON_DIR / "bin"
    ENGINE_OUTPUT_NAME = "engine.exe"
    ENGINE_ICON_FILE_PATH = UI_EXPORT_DIR / "logo.ico"


config = Config()
