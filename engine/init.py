import os
import signal
import threading
import time

import psutil
from aiohttp import ClientSession, ClientTimeout
from loguru import logger

from engine.app import the_app
from engine.cfg.client import config as cfg_client


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


async def init_app() -> None:
    the_app.client_session = ClientSession(timeout=ClientTimeout(total=cfg_client.HTTP_TIMEOUT))

    cfg = the_app.load_config()
    the_app.update_session_token(cfg.session_token)

    await the_app.start_background_tasks()
