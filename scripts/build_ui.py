import sys

from scripts.cfg import config as cfg_scripts
from scripts.proc import run


def build_ui() -> None:
    if not cfg_scripts.UI_DIR.exists():
        print("Error: ui directory not found.")  # noqa: T201
        sys.exit(1)

    print("==== Build/Exporting UI ====")  # noqa: T201
    run("npm install", cwd=cfg_scripts.UI_DIR)
    run("npm run export", cwd=cfg_scripts.UI_DIR)

    print("\n🎉 Build/Export complete!")  # noqa: T201
    print("Export created:")  # noqa: T201
    print(f"  {cfg_scripts.UI_EXPORT_DIR}")  # noqa: T201


def main() -> None:
    build_ui()


if __name__ == "__main__":
    main()
