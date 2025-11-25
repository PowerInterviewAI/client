import threading


class ServiceStatusManager:
    def __init__(self) -> None:
        self._is_backend_live = False
        self._lock = threading.Lock()

    def set_backend_live(self, is_running: bool) -> None:  # noqa: FBT001
        with self._lock:
            self._is_backend_live = is_running

    def is_backend_live(self) -> bool:
        with self._lock:
            return self._is_backend_live


SETVICE_STATUS_MANAGER = ServiceStatusManager()
