import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
UI_DIR = PROJECT_ROOT / "ui"
ENGINE_MAIN = PROJECT_ROOT / "engine" / "main.py"
ENGINE_OUTPUT_DIR = PROJECT_ROOT / "dist"
ENGINE_OUTPUT_NAME = "engine.exe"


def run(command, cwd=None):
    """
    Run a shell command and stream output live.
    Raises an error if the command fails.
    """
    print(f"\n>>> Running: {command}")
    result = subprocess.run(command, cwd=cwd, shell=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {command}")


def main():
    # 1. Build UI export
    if not UI_DIR.exists():
        print("Error: ui directory not found.")
        sys.exit(1)

    print("=== Step 1: Exporting UI ===")
    run("npm install", cwd=UI_DIR)
    run("npm run export", cwd=UI_DIR)

    # 2. Run Nuitka build

    if not ENGINE_MAIN.exists():
        print("Error: engine/main.py not found.")
        sys.exit(1)

    print("=== Step 2: Building EXE with Nuitka ===")

    nuitka_cmd = (
        f"python -m nuitka {ENGINE_MAIN} "
        f"--standalone "
        f"--onefile "
        f"--follow-imports "
        f"--output-dir={ENGINE_OUTPUT_DIR} "
        f"--output-filename={ENGINE_OUTPUT_NAME} "
        f"--include-data-dir=engine/public=engine/public "
        f"--assume-yes-for-downloads"
    )

    run(nuitka_cmd, cwd=PROJECT_ROOT)

    print("\n🎉 Build complete!")
    print(f"Executable created:")
    print(f"  {ENGINE_OUTPUT_DIR / ENGINE_OUTPUT_NAME}")


if __name__ == "__main__":
    main()
