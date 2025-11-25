import threading
import time

import requests

from engine.cfg.client import config as cfg_client
from engine.services.service_status_manager import SETVICE_STATUS_MANAGER


def init_backend_ping() -> None:
    def worker() -> None:
        while True:
            try:
                resp = requests.get(
                    cfg_client.BACKEND_PING_URL,
                    timeout=3,
                )
                resp.raise_for_status()

                SETVICE_STATUS_MANAGER.set_backend_live(True)
            except Exception:
                SETVICE_STATUS_MANAGER.set_backend_live(False)

            finally:
                time.sleep(1)

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()
