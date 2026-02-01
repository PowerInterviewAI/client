"""Build Audio Control Agent executable using Nuitka."""

import sys

from scripts.cfg import config as cfg
from scripts.proc import run


def build_audio_control_agent() -> None:
    """Build Audio Control Agent with Nuitka."""
    audio_main = cfg.AGENTS_DIR / "audio_control" / "main.py"
    output_dir = cfg.AGENTS_BUILD_DIR
    output_name = "audio_control_agent.exe"

    if not audio_main.exists():
        print(f"❌ Error: {audio_main} not found.")  # noqa: T201
        sys.exit(1)

    print("==== Building Audio Control Agent ====")  # noqa: T201

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    nuitka_cmd = (
        f"python -m nuitka {audio_main} "
        "--standalone "
        "--include-package=agents.audio_control "
        "--include-package=agents.shared "
        "--follow-imports "
        f"--output-dir={output_dir} "
        f"--output-filename={output_name} "
        "--assume-yes-for-downloads "
        "--windows-console-mode=attach "
    )

    run(nuitka_cmd)

    built_exe = output_dir / output_name
    if built_exe.exists():
        print(f"✅ Audio Control Agent built: {built_exe}")  # noqa: T201
    else:
        print("❌ Build failed - executable not found")  # noqa: T201
        sys.exit(1)


if __name__ == "__main__":
    build_audio_control_agent()
