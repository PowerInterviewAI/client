import os
import signal
import threading
import time

import psutil
from loguru import logger

from engine.app import the_app


def init_watch_parent() -> None:
    def worker() -> None:
        logger.debug("Watching parent process...")

        ppid = os.getppid()
        logger.debug(f"Parent process ID: {ppid}")

        while True:
            try:
                if not psutil.pid_exists(ppid):
                    logger.debug("Parent Electron process exited. Shutting down FastAPI.")
                    os.kill(os.getpid(), signal.SIGTERM)
                    break
            except Exception as e:
                logger.error(f"Error checking parent process: {e}")
            time.sleep(2)  # check every 2 seconds

    # Start watcher thread early in FastAPI startup
    threading.Thread(target=worker, daemon=True).start()


def init_app() -> None:
    the_app.load_config()
    the_app.start_background_tasks()
