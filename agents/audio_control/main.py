import argparse
import os
import signal
import sys
import threading
import time
from types import FrameType

from loguru import logger

from agents.audio_control.audio_controller import AudioController
from agents.shared.audio_device_service import AudioDeviceService


def signal_handler(_signum: int, _frame: FrameType | None) -> None:
    """Handle keyboard interrupt signal."""
    logger.info("Received interrupt signal. Shutting down gracefully...")
    sys.exit(0)


def monitor_parent_process(parent_pid: int, processor: AudioController) -> None:
    """Monitor parent process and exit if it dies."""
    logger.info(f"Monitoring parent process PID: {parent_pid}")
    while processor.running:
        try:
            # os.kill with signal 0 checks if process exists without sending a signal
            os.kill(parent_pid, 0)
        except (OSError, ProcessLookupError):
            logger.warning(f"Parent process {parent_pid} no longer exists. Shutting down...")
            processor.stop()
            break
        time.sleep(1.0)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Audio Control Agent - Delays audio from input device to VBCABLE output",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --input "Microphone" --delay 500
  python main.py -i "USB Audio" -d 1000
  python main.py --list-devices
        """,
    )

    parser.add_argument(
        "-i",
        "--input",
        dest="input_device",
        type=str,
        help="Audio input device name (partial match supported)",
    )

    parser.add_argument(
        "-d",
        "--delay",
        dest="delay",
        type=float,
        default=0,
        help="Audio delay in milliseconds (default: 0)",
    )

    parser.add_argument(
        "--list-devices",
        action="store_true",
        help="List all available audio devices and exit",
    )

    parser.add_argument(
        "--watch-parent",
        action="store_true",
        help="Monitor parent process and exit if it dies",
    )

    args = parser.parse_args()

    # Setup signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)

    processor = None

    try:
        # Just list devices if requested
        if args.list_devices:
            devices = AudioDeviceService.get_audio_devices()
            logger.info("\n=== Available Audio Devices ===")
            for device in devices:
                device_type = []
                if device["max_input_channels"] > 0:
                    device_type.append("INPUT")
                if device["max_output_channels"] > 0:
                    device_type.append("OUTPUT")
                logger.info(f"[{device['index']}] {device['name']} ({', '.join(device_type)})")
            logger.info("=" * 50)
            return

        # Validate required arguments
        if not args.input_device:
            parser.error("--input argument is required (use --list-devices to see available devices)")

        # Create and start processor
        processor = AudioController(args.input_device, args.delay)

        # Start parent process monitor if requested
        if args.watch_parent:
            parent_pid = os.getppid()
            monitor_thread = threading.Thread(
                target=monitor_parent_process,
                args=(parent_pid, processor),
                daemon=True,
                name="parent-monitor",
            )
            monitor_thread.start()

        processor.start()

    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received. Exiting...")
    except Exception as e:
        logger.exception(f"Error: {e}")
        sys.exit(1)
    finally:
        if processor:
            processor.stop()
            processor.cleanup()


if __name__ == "__main__":
    sys.exit(main())
