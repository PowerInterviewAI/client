"""
ASR Agent - Main Entry Point
Reads audio from a source and transcribes via backend websocket, then outputs to ZeroMQ.
"""

import argparse
import signal
import sys

from loguru import logger

from asr_agent.asr_agent import ASRAgent

# Default configuration
DEFAULT_ZMQ_PORT = 50002
DEFAULT_AUDIO_SOURCE = "loopback"
DEFAULT_BACKEND_URL = "ws://localhost:8000/api/asr/streaming"


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(description="ASR Agent - Captures audio and transcribes via backend websocket")
    parser.add_argument(
        "-p",
        "--port",
        type=int,
        default=DEFAULT_ZMQ_PORT,
        help=f"ZeroMQ port (default: {DEFAULT_ZMQ_PORT})",
    )
    parser.add_argument(
        "-s",
        "--source",
        type=str,
        default=DEFAULT_AUDIO_SOURCE,
        help=f"Audio source: 'loopback' or device name (default: {DEFAULT_AUDIO_SOURCE})",
    )
    parser.add_argument(
        "-u",
        "--url",
        type=str,
        default=DEFAULT_BACKEND_URL,
        help=f"Backend websocket URL (default: {DEFAULT_BACKEND_URL})",
    )
    parser.add_argument(
        "-t",
        "--token",
        type=str,
        default=None,
        help="Authentication token for websocket (will be sent as cookie 'session_token=<token>')",
    )

    args = parser.parse_args()

    # Create agent
    agent = ASRAgent(
        zmq_port=args.port,
        audio_source=args.source,
        backend_url=args.url,
        session_token=args.token,
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
