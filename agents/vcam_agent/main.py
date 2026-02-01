"""
Virtual Camera Agent - Main Entry Point
"""

import argparse
import signal
import sys

from loguru import logger

from agents.vcam_agent.vcam_agent import VCamAgent

DEFAULT_ZMQ_PORT: int = 50001
STATS_INTERVAL_SECONDS: int = 5


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Virtual Camera Agent - Receives frames via ZeroMQ")
    parser.add_argument(
        "-w",
        "--width",
        type=int,
        default=1280,
        help="Frame width (default: 1280)",
    )
    parser.add_argument(
        "-H",
        "--height",
        type=int,
        default=720,
        help="Frame height (default: 720)",
    )
    parser.add_argument(
        "-f",
        "--fps",
        type=int,
        default=30,
        help="Frames per second (default: 30)",
    )
    parser.add_argument(
        "-p",
        "--port",
        type=int,
        default=DEFAULT_ZMQ_PORT,
        help=f"ZeroMQ port (default: {DEFAULT_ZMQ_PORT})",
    )
    parser.add_argument(
        "-n",
        "--no-datetime",
        action="store_true",
        help="Disable datetime overlay (default: False)",
    )

    args = parser.parse_args()

    # Create and run agent
    agent = VCamAgent(
        width=args.width,
        height=args.height,
        fps=args.fps,
        zmq_port=args.port,
        show_datetime=not args.no_datetime,
        stats_interval=STATS_INTERVAL_SECONDS,
    )

    # Setup signal handlers for graceful shutdown
    def signal_handler(signum: int, _frame: object) -> None:
        logger.info(f"Received signal {signum}")
        agent.running = False

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    return agent.run()


if __name__ == "__main__":
    sys.exit(main())
