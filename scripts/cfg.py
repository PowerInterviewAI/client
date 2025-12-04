from pathlib import Path


class Config:
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    UI_DIR = PROJECT_ROOT / "ui"
    ELECTRON_DIR = PROJECT_ROOT / "ui_container"

    UI_EXPORT_DIR = PROJECT_ROOT / "engine" / "public"

    ENGINE_MAIN = PROJECT_ROOT / "engine" / "main.py"
    ENGINE_OUTPUT_DIR = ELECTRON_DIR / "bin"
    ENGINE_OUTPUT_NAME = "engine.exe"


config = Config()
