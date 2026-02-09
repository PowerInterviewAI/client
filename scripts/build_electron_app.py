"""Build Electron app (UI Container)."""

import sys

from scripts.cfg import config as cfg
from scripts.proc import run


def build_electron_app() -> None:
    """Build Electron application."""
    electron_dir = cfg.ELECTRON_DIR

    if not electron_dir.exists():
        print(f"❌ Error: {electron_dir} not found.")  # noqa: T201
        sys.exit(1)

    print("==== Building Electron App ====")  # noqa: T201

    # Install dependencies if needed
    print("Installing npm dependencies...")  # noqa: T201
    run("npm install", cwd=str(electron_dir))

    # Build the Electron app
    print("Building Electron app...")  # noqa: T201
    run("npm run electron:build", cwd=str(electron_dir))

    print("✅ Electron app built successfully")  # noqa: T201


if __name__ == "__main__":
    build_electron_app()
