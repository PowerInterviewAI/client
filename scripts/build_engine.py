import os
import shutil
import sys

from scripts.cfg import config as cfg_scripts
from scripts.proc import run


def assert_msvc_env() -> None:
    missing = []

    if "VSCMD_VER" not in os.environ:
        missing.append("VSCMD_VER")

    if not shutil.which("cl.exe"):
        missing.append("cl.exe")

    if missing:
        print(  # noqa: T201
            "❌ MSVC environment not initialized.\n"
            "Missing: " + ", ".join(missing) + "\n\n"
            "Fix:\n"
            "  Run this from 'Developer Command Prompt for VS'\n"
        )
        sys.exit(1)


def build_engine() -> None:
    # Ensure MSVC environment is set up
    assert_msvc_env()

    # Ensure main.py exists
    if not cfg_scripts.ENGINE_MAIN.exists():
        print("Error: engine/main.py not found.")  # noqa: T201
        sys.exit(1)

    print("==== Building EXE with Nuitka ====")  # noqa: T201

    nuitka_cmd = (
        f"python -m nuitka {cfg_scripts.ENGINE_MAIN} "
        f"--standalone "
        "--include-package=websockets.asyncio "
        "--include-package=engine "
        "--include-module=engine.main "
        f"--follow-imports "
        f"--output-dir={cfg_scripts.ENGINE_OUTPUT_DIR} "
        f"--output-filename={cfg_scripts.ENGINE_OUTPUT_NAME} "
        f"--include-data-dir=engine/public=engine/public "
        f"--assume-yes-for-downloads "
        f"--windows-icon-from-ico={cfg_scripts.ENGINE_ICON_FILE_PATH}"
    )

    run(nuitka_cmd, cwd=cfg_scripts.PROJECT_ROOT)

    print("\n🎉 Build complete!")  # noqa: T201
    print("Executable created:")  # noqa: T201
    print(f"  {cfg_scripts.ENGINE_OUTPUT_DIR / cfg_scripts.ENGINE_OUTPUT_NAME}")  # noqa: T201


def main() -> None:
    build_engine()


if __name__ == "__main__":
    main()
