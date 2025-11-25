import threading
import time

import requests

from engine.cfg.client import config as cfg_client


class ServiceMonitor:
    def __init__(self) -> None:
        self._is_backend_live = False
        self._lock = threading.Lock()

    def set_backend_live(self, is_running: bool) -> None:  # noqa: FBT001
        with self._lock:
            self._is_backend_live = is_running

    def is_backend_live(self) -> bool:
        with self._lock:
            return self._is_backend_live

    def start_backend_monitor(self) -> None:
        def worker() -> None:
            while True:
                try:
                    resp = requests.get(
                        cfg_client.BACKEND_PING_URL,
                        timeout=3,
                    )
                    resp.raise_for_status()

                    self.set_backend_live(True)
                except Exception:
                    self.set_backend_live(False)

                finally:
                    time.sleep(1)

        thread = threading.Thread(target=worker, daemon=True)
        thread.start()
