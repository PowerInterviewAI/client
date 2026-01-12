import time
from datetime import datetime

from scripts.build_engine import build_engine
from scripts.build_ui import build_ui
from scripts.build_ui_container import build_ui_container


def main() -> None:
    start_ts = time.time()
    start_dt = datetime.now().astimezone()
    print(f"Start time (local): {start_dt.strftime('%Y-%m-%d %H:%M:%S %Z%z')}")  # noqa: T201

    try:
        # ---- Build UI ----
        build_ui()

        # ---- Run Nuitka build ----
        build_engine()

        # ---- Run Electron Build ----
        build_ui_container()
    finally:
        end_dt = datetime.now().astimezone()
        elapsed = time.time() - start_ts
        print(f"End time (local): {end_dt.strftime('%Y-%m-%d %H:%M:%S %Z%z')}")  # noqa: T201
        print(f"Total elapsed time: {elapsed:.2f} seconds")  # noqa: T201


if __name__ == "__main__":
    main()
