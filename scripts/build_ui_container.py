from scripts.cfg import config as cfg_scripts
from scripts.proc import run


def build_ui_container() -> None:
    print("\n==== Building Electron App ====")  # noqa: T201

    run("npm install", cwd=cfg_scripts.ELECTRON_DIR)
    run("npm run build", cwd=cfg_scripts.ELECTRON_DIR)

    print("\n🎉 Build complete!")  # noqa: T201
    print("Executable created:")  # noqa: T201
    print(f"  {cfg_scripts.ELECTRON_DIR / 'dist' / 'PowerInterview-Setup-*.*.*.exe'}")  # noqa: T201


def main() -> None:
    build_ui_container()


if __name__ == "__main__":
    main()
