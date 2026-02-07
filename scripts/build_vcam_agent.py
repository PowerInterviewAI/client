"""Build VCam Agent executable using Nuitka."""

import shutil
import sys

from scripts.cfg import config as cfg
from scripts.proc import run


def build_vcam_agent() -> None:
    """Build VCam Agent with Nuitka."""
    vcam_main = cfg.AGENTS_DIR / "vcam" / "main.py"
    # Use separate build directory for VCam agent to avoid conflicts
    build_dir = cfg.AGENTS_BUILD_DIR / "vcam.build"
    dist_dir = cfg.AGENTS_DIST_DIR  # Shared output directory for all agents
    output_name = "vcam_agent.exe"

    if not vcam_main.exists():
        print(f"❌ Error: {vcam_main} not found.")  # noqa: T201
        sys.exit(1)

    print("==== Building VCam Agent ====")  # noqa: T201

    # Create output directory
    build_dir.mkdir(parents=True, exist_ok=True)

    nuitka_cmd = (
        f"python -m nuitka {vcam_main} "
        "--standalone "
        "--include-package=agents.vcam "
        "--follow-imports "
        f"--output-dir={build_dir} "
        f"--output-filename={output_name} "
        "--assume-yes-for-downloads "
        "--windows-console-mode=attach "
    )

    run(nuitka_cmd)

    # Nuitka creates main.dist inside build_dir
    built_dist = build_dir / "main.dist"
    built_exe = built_dist / output_name

    if built_exe.exists():
        # Merge contents from main.dist to shared dist_dir

        # Ensure dist_dir exists
        dist_dir.mkdir(parents=True, exist_ok=True)

        # Copy all files, merging with existing content (Python 3.8+)
        shutil.copytree(built_dist, dist_dir, dirs_exist_ok=True)

        final_exe = dist_dir / output_name
        print(f"✅ VCam Agent built: {final_exe}")  # noqa: T201
    else:
        print(f"❌ Build failed - executable not found: {built_exe}")  # noqa: T201
        sys.exit(1)


if __name__ == "__main__":
    build_vcam_agent()
