"""Build VCam Agent executable using Nuitka."""

import sys

from scripts.cfg import config as cfg
from scripts.proc import run


def build_vcam_agent() -> None:
    """Build VCam Agent with Nuitka."""
    vcam_main = cfg.AGENTS_DIR / "vcam" / "main.py"
    output_dir = cfg.AGENTS_BUILD_DIR
    output_name = "vcam_agent.exe"

    if not vcam_main.exists():
        print(f"❌ Error: {vcam_main} not found.")  # noqa: T201
        sys.exit(1)

    print("==== Building VCam Agent ====")  # noqa: T201

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    nuitka_cmd = (
        f"python -m nuitka {vcam_main} "
        "--standalone "
        "--include-package=agents.vcam "
        "--follow-imports "
        f"--output-dir={output_dir} "
        f"--output-filename={output_name} "
        "--assume-yes-for-downloads "
        "--windows-console-mode=attach "
    )

    run(nuitka_cmd)

    built_exe = output_dir / output_name
    if built_exe.exists():
        print(f"✅ VCam Agent built: {built_exe}")  # noqa: T201
    else:
        print(f"❌ Build failed - executable not found: {built_exe}")  # noqa: T201
        sys.exit(1)


if __name__ == "__main__":
    build_vcam_agent()
