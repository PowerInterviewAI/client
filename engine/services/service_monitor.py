import asyncio
import contextlib
from collections.abc import Awaitable, Callable
from typing import Any

from aiohttp import ClientSession

from engine.cfg.client import config as cfg_client
from engine.services.device_service import DeviceService


class ServiceMonitor:
    def __init__(
        self,
        on_logged_out: Callable[[], Awaitable[None]] | None = None,
    ) -> None:
        self._is_logged_in = False
        self._is_backend_live = False
        self._is_gpu_server_live = False

        self._backend_monitor_task: asyncio.Task[Any] | None = None
        self._gpu_server_monitor_task: asyncio.Task[Any] | None = None
        self._auth_monitor_task: asyncio.Task[Any] | None = None

        self._lock = asyncio.Lock()
        self._on_logged_out = on_logged_out

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
                        await asyncio.sleep(60)

                except Exception:
                    await self.set_backend_live(False)
                    await asyncio.sleep(1)

        self._backend_monitor_task = asyncio.create_task(worker())

    async def start_auth_monitor(self, client_session: ClientSession) -> None:
        async def worker() -> None:
            while True:
                # If backend is not live, mark as not logged in
                if not await self.is_backend_live():
                    # If just logged out
                    if await self.is_logged_in():  # noqa: SIM102
                        # Trigger logged out callback
                        if self._on_logged_out:
                            await self._on_logged_out()

                    await self.set_logged_in(False)

                    await asyncio.sleep(1)
                    continue

                # Ping backend with device info to check login status
                try:
                    device_info = DeviceService.get_device_info()
                    async with client_session.post(
                        cfg_client.BACKEND_PING_CLIENT_URL,
                        json=device_info.model_dump(mode="json"),
                    ) as resp:
                        resp.raise_for_status()

                        await self.set_logged_in(True)
                        await asyncio.sleep(60)

                except Exception:
                    # If just logged out
                    if await self.is_logged_in():  # noqa: SIM102
                        # Trigger logged out callback
                        if self._on_logged_out:
                            await self._on_logged_out()

                    await self.set_logged_in(False)
                    await asyncio.sleep(1)

        self._auth_monitor_task = asyncio.create_task(worker())

    async def start_gpu_server_monitor(self, client_session: ClientSession) -> None:
        async def worker() -> None:
            while True:
                # If not logged in, mark GPU server as not live
                if not await self.is_logged_in():
                    await self.set_gpu_server_live(False)

                    await asyncio.sleep(1)
                    continue

                # Ping GPU server
                try:
                    async with client_session.get(cfg_client.BACKEND_PING_GPU_SERVER_URL) as resp:
                        resp.raise_for_status()

                        await self.set_gpu_server_live(True)
                        await asyncio.sleep(60)

                except Exception:
                    await self.set_gpu_server_live(False)
                    await asyncio.sleep(1)

        self._gpu_server_monitor_task = asyncio.create_task(worker())

    async def start_wakeup_gpu_server_loop(self, client_session: ClientSession) -> None:
        async def worker() -> None:
            while True:
                # If not logged in, skip wakeup
                if not await self.is_logged_in():
                    await asyncio.sleep(1)
                    continue

                # Wakeup GPU server
                with contextlib.suppress(Exception):
                    async with client_session.get(cfg_client.BACKEND_WAKEUP_GPU_SERVER_URL) as resp:
                        resp.raise_for_status()

                await asyncio.sleep(1)

        self._gpu_server_monitor_task = asyncio.create_task(worker())
