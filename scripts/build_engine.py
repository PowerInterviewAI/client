import pathlib
import subprocess
import sys


def init_venv() -> None:
    venv_python = cfg_scripts.PROJECT_ROOT / "venv" / "Scripts" / "python.exe"

    if pathlib.Path("venv").exists() and sys.prefix != str(pathlib.Path("venv").resolve()):
        print("Re-executing inside venv...")  # noqa: T201
        # Re-run as a module, not a file
        subprocess.check_call([str(venv_python), "-m", "scripts.build_engine", *sys.argv[1:]])  # noqa: S603
        sys.exit(0)


from scripts.cfg import config as cfg_scripts  # noqa: E402
from scripts.proc import run  # noqa: E402


def build_engine() -> None:
    if not cfg_scripts.ENGINE_MAIN.exists():
        print("Error: engine/main.py not found.")  # noqa: T201
        sys.exit(1)

    print("==== Building EXE with Nuitka ====")  # noqa: T201

    nuitka_cmd = (
        f"{sys.executable} -m nuitka {cfg_scripts.ENGINE_MAIN} "
        f"--standalone "
        f"--onefile "
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
    init_venv()
    main()
