"""Build ASR Agent executable using Nuitka."""

import sys
from pathlib import Path

from scripts.cfg import config as cfg
from scripts.proc import run


def build_asr_agent() -> None:
    """Build ASR Agent with Nuitka."""
    asr_main = cfg.PROJECT_ROOT / "asr_agent" / "main.py"
    output_dir = cfg.PROJECT_ROOT / "build" / "agents" / "win-x64"
    output_name = "asr_agent.exe"

    if not asr_main.exists():
        print(f"❌ Error: {asr_main} not found.")  # noqa: T201
        sys.exit(1)

    print("==== Building ASR Agent ====")  # noqa: T201

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    nuitka_cmd = (
        f"python -m nuitka {asr_main} "
        "--standalone "
        "--include-package=asr_agent "
        "--include-package=shared "
        "--follow-imports "
        f"--output-dir={output_dir.parent} "
        f"--output-filename={output_name} "
        "--assume-yes-for-downloads "
        "--windows-console-mode=attach "
    )

    run(nuitka_cmd)

    built_exe = output_dir / output_name
    if built_exe.exists():
        print(f"✅ ASR Agent built: {built_exe}")  # noqa: T201
    else:
        print("❌ Build failed - executable not found")  # noqa: T201
        sys.exit(1)


if __name__ == "__main__":
    build_asr_agent()
