import threading
import time

import requests

from backend.cfg.client import config as cfg_client
from backend.services.config_service import ConfigService
from backend.services.service_status_manager import service_status_manager
from backend.services.virtual_camera import virtual_camera_service


def init_config() -> None:
    ConfigService.load_config()


def init_backend_ping() -> None:
    def worker() -> None:
        while True:
            try:
                resp = requests.get(
                    cfg_client.BACKEND_PING_URL,
                    timeout=3,
                )
                resp.raise_for_status()

                service_status_manager.set_backend_live(True)
            except Exception:
                service_status_manager.set_backend_live(False)

            finally:
                time.sleep(1)

    thread = threading.Thread(target=worker, daemon=True)
    thread.start()


def init_virtual_camera_loop() -> None:
    virtual_camera_service.start()
