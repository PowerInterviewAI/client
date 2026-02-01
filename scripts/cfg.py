from pathlib import Path


class Config:
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    AGENTS_DIR = PROJECT_ROOT / "agents"
    ELECTRON_DIR = PROJECT_ROOT / "app"
    BUILD_DIR = PROJECT_ROOT / "build"
    DIST_DIR = PROJECT_ROOT / "dist"

    # Agent build configuration
    AGENTS_BUILD_DIR = BUILD_DIR / "agents" / "win-x64"


config = Config()
