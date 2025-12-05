from scripts.build_engine import build_engine
from scripts.build_ui import build_ui
from scripts.build_ui_container import build_ui_container


def main() -> None:
    # ---- Build UI ----
    build_ui()

    # ---- Run Nuitka build ----
    build_engine()

    # ---- Run Electron Build ----
    build_ui_container()


if __name__ == "__main__":
    main()
