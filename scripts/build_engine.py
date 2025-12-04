import sys

from scripts.cfg import config as cfg_scripts
from scripts.proc import run


def build_engine() -> None:
    if not cfg_scripts.ENGINE_MAIN.exists():
        print("Error: engine/main.py not found.")  # noqa: T201
        sys.exit(1)

    print("==== Building EXE with Nuitka ====")  # noqa: T201

    nuitka_cmd = (
        f"python -m nuitka {cfg_scripts.ENGINE_MAIN} "
        f"--standalone "
        f"--onefile "
        "--include-package=websockets.asyncio "
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
