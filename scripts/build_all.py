"""Build all components: agents and Electron app."""

import time
from datetime import datetime

from scripts.build_asr_agent import build_asr_agent
from scripts.build_audio_control_agent import build_audio_control_agent
from scripts.build_electron_app import build_electron_app
from scripts.build_vcam_agent import build_vcam_agent


def main() -> None:
    """Build all components in sequence."""
    start_ts = time.time()
    start_dt = datetime.now().astimezone()
    print(f"\n{'=' * 60}")  # noqa: T201
    print("🚀 Building All Components")  # noqa: T201
    print(f"Start time: {start_dt.strftime('%Y-%m-%d %H:%M:%S %Z')}")  # noqa: T201
    print(f"{'=' * 60}\n")  # noqa: T201

    try:
        # Build all agents
        print("\n📦 Building Agents...\n")  # noqa: T201
        build_asr_agent()
        build_vcam_agent()
        build_audio_control_agent()

        # Build Electron app
        print("\n⚡ Building Electron App...\n")  # noqa: T201
        build_electron_app()

        print("\n" + "=" * 60)  # noqa: T201
        print("✅ All builds completed successfully!")  # noqa: T201

    except Exception as e:
        print(f"\n❌ Build failed: {e}")  # noqa: T201
        raise

    finally:
        end_dt = datetime.now().astimezone()
        elapsed = time.time() - start_ts
        print(f"End time: {end_dt.strftime('%Y-%m-%d %H:%M:%S %Z')}")  # noqa: T201
        print(f"Total elapsed: {elapsed:.2f} seconds")  # noqa: T201
        print("=" * 60 + "\n")  # noqa: T201


if __name__ == "__main__":
    main()
