import subprocess
import sys
from pathlib import Path


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
    project_root = Path(__file__).resolve().parent

    # 1. Build UI export
    ui_dir = project_root / "ui"
    if not ui_dir.exists():
        print("Error: ui directory not found.")
        sys.exit(1)

    print("=== Step 1: Exporting UI ===")
    run("npm install", cwd=ui_dir)
    run("npm run export", cwd=ui_dir)

    # 2. Run Nuitka build
    engine_main = project_root / "engine" / "main.py"
    if not engine_main.exists():
        print("Error: engine/main.py not found.")
        sys.exit(1)

    print("=== Step 2: Building EXE with Nuitka ===")

    nuitka_cmd = (
        f"python -m nuitka {engine_main} "
        f"--standalone "
        f"--onefile "
        f"--follow-imports "
        f"--include-data-dir=engine/public=engine/public "
        f"--assume-yes-for-downloads"
    )

    run(nuitka_cmd, cwd=project_root)

    print("\n🎉 Build complete!")
    print("Check the 'main.dist' or resulting .exe file.")


if __name__ == "__main__":
    main()
