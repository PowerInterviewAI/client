import asyncio
import contextlib
from typing import Any

from aiohttp import ClientSession

from engine.cfg.client import config as cfg_client


class ServiceMonitor:
    def __init__(self) -> None:
        self._is_logged_in = False
        self._is_backend_live = False
        self._is_gpu_server_live = False

        self._backend_monitor_task: asyncio.Task[Any] | None = None
        self._gpu_server_monitor_task: asyncio.Task[Any] | None = None
        self._auth_monitor_task: asyncio.Task[Any] | None = None

        self._lock = asyncio.Lock()

    async def set_backend_live(self, is_running: bool) -> None:  # noqa: FBT001
        async with self._lock:
            self._is_backend_live = is_running

    async def set_logged_in(self, is_logged_in: bool) -> None:  # noqa: FBT001
        async with self._lock:
            self._is_logged_in = is_logged_in

    async def is_backend_live(self) -> bool:
        async with self._lock:
            return self._is_backend_live

    async def is_logged_in(self) -> bool:
        async with self._lock:
            return self._is_logged_in

    async def set_gpu_server_live(self, is_running: bool) -> None:  # noqa: FBT001
        async with self._lock:
            self._is_gpu_server_live = is_running

    async def is_gpu_server_live(self) -> bool:
        async with self._lock:
            return self._is_gpu_server_live

    async def start_backend_monitor(self, client_session: ClientSession) -> None:
        async def worker() -> None:
            while True:
                try:
                    async with client_session.get(cfg_client.BACKEND_PING_URL) as resp:
                        resp.raise_for_status()

                        await self.set_backend_live(True)
                except Exception:
                    await self.set_backend_live(False)

                finally:
                    await asyncio.sleep(1)

        self._backend_monitor_task = asyncio.create_task(worker())

    async def start_auth_monitor(self, client_session: ClientSession) -> None:
        async def worker() -> None:
            while True:
                try:
                    async with client_session.get(cfg_client.BACKEND_PING_CLIENT_URL) as resp:
                        resp.raise_for_status()

                        await self.set_logged_in(True)
                except Exception:
                    await self.set_logged_in(False)

                finally:
                    await asyncio.sleep(1)

        self._auth_monitor_task = asyncio.create_task(worker())

    async def start_gpu_server_monitor(self, client_session: ClientSession) -> None:
        async def worker() -> None:
            while True:
                try:
                    async with client_session.get(cfg_client.BACKEND_PING_GPU_SERVER_URL) as resp:
                        resp.raise_for_status()

                        await self.set_gpu_server_live(True)
                except Exception:
                    await self.set_gpu_server_live(False)

                finally:
                    await asyncio.sleep(1)

        self._gpu_server_monitor_task = asyncio.create_task(worker())

    async def start_wakeup_gpu_server_loop(self, client_session: ClientSession) -> None:
        async def worker() -> None:
            while True:
                with contextlib.suppress(Exception):
                    async with client_session.get(cfg_client.BACKEND_WAKEUP_GPU_SERVER_URL) as resp:
                        resp.raise_for_status()

                await asyncio.sleep(1)

        self._gpu_server_monitor_task = asyncio.create_task(worker())
