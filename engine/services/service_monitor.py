import contextlib
import threading
import time
from http import HTTPStatus
from typing import TYPE_CHECKING

from loguru import logger

from engine.api.error_handler import raise_for_status
from engine.cfg.client import config as cfg_client
from engine.services.web_client import WebClient

if TYPE_CHECKING:
    from engine.app import PowerInterviewApp


class ServiceMonitor:
    def __init__(self, app: "PowerInterviewApp") -> None:
        self._app = app
        self._is_logged_in: bool | None = None
        self._is_backend_live = False
        self._is_gpu_server_live = False

        self._backend_thread: threading.Thread | None = None
        self._gpu_server_thread: threading.Thread | None = None
        self._auth_thread: threading.Thread | None = None
        self._wakeup_thread: threading.Thread | None = None

        self._lock = threading.Lock()
        self._stop_event = threading.Event()

    def set_backend_live(self, is_running: bool) -> None:  # noqa: FBT001
        with self._lock:
            self._is_backend_live = is_running

    def set_logged_in(self, is_logged_in: bool | None) -> None:  # noqa: FBT001
        with self._lock:
            self._is_logged_in = is_logged_in

    def is_backend_live(self) -> bool:
        with self._lock:
            return self._is_backend_live

    def is_logged_in(self) -> bool | None:
        with self._lock:
            return self._is_logged_in

    def set_gpu_server_live(self, is_running: bool) -> None:  # noqa: FBT001
        with self._lock:
            self._is_gpu_server_live = is_running

    def is_gpu_server_live(self) -> bool:
        with self._lock:
            return self._is_gpu_server_live

    def _backend_worker(self) -> None:
        while not self._stop_event.is_set():
            try:
                resp = WebClient.get(cfg_client.BACKEND_PING_URL)
                raise_for_status(resp)

                self.set_backend_live(True)
                time.sleep(60)

            except Exception:
                self.set_backend_live(False)
                time.sleep(1)

    def start_backend_monitor(self) -> None:
        if self._backend_thread and self._backend_thread.is_alive():
            return
        self._backend_thread = threading.Thread(target=self._backend_worker, daemon=True)
        self._backend_thread.start()

    def _gpu_worker(self) -> None:
        while not self._stop_event.is_set():
            # If not logged in, mark GPU server as not live
            if not self.is_logged_in():
                self.set_gpu_server_live(False)

                time.sleep(1)
                continue

            # Ping GPU server
            try:
                resp = WebClient.get(cfg_client.BACKEND_PING_GPU_SERVER_URL)
                if resp.status_code == HTTPStatus.UNAUTHORIZED:
                    logger.warning("Unauthorized, logging out")
                    self.set_logged_in(False)
                    self.set_gpu_server_live(False)
                    continue

                raise_for_status(resp)
                self.set_gpu_server_live(True)
                time.sleep(60)

            except Exception:
                self.set_gpu_server_live(False)
                time.sleep(1)

    def start_gpu_server_monitor(self) -> None:
        if self._gpu_server_thread and self._gpu_server_thread.is_alive():
            return
        self._gpu_server_thread = threading.Thread(target=self._gpu_worker, daemon=True)
        self._gpu_server_thread.start()

    def _wakeup_worker(self) -> None:
        while not self._stop_event.is_set():
            # If not logged in, skip wakeup
            if not self.is_logged_in():
                time.sleep(1)
                continue

            # Wakeup GPU server
            with contextlib.suppress(Exception):
                resp = WebClient.get(cfg_client.BACKEND_WAKEUP_GPU_SERVER_URL)
                if resp.status_code == HTTPStatus.UNAUTHORIZED:
                    logger.warning("Unauthorized, logging out")
                    self.set_logged_in(False)
                    continue

                raise_for_status(resp)
            time.sleep(1)

    def start_wakeup_gpu_server_loop(self) -> None:
        if self._wakeup_thread and self._wakeup_thread.is_alive():
            return
        self._wakeup_thread = threading.Thread(target=self._wakeup_worker, daemon=True)
        self._wakeup_thread.start()

    def stop_all(self) -> None:
        self._stop_event.set()
        for thread in [self._backend_thread, self._auth_thread, self._gpu_server_thread, self._wakeup_thread]:
            if thread and thread.is_alive():
                thread.join(timeout=5)
