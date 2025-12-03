import asyncio
from typing import Any

import aiohttp

from engine.cfg.client import config as cfg_client


class ServiceMonitor:
    def __init__(self) -> None:
        self._monitor_task: asyncio.Task[Any] | None = None
        self._is_backend_live = False
        self._lock = asyncio.Lock()

    async def set_backend_live(self, is_running: bool) -> None:  # noqa: FBT001
        async with self._lock:
            self._is_backend_live = is_running

    async def is_backend_live(self) -> bool:
        async with self._lock:
            return self._is_backend_live

    async def start_backend_monitor(self) -> None:
        async def worker() -> None:
            while True:
                try:
                    timeout = aiohttp.ClientTimeout(total=cfg_client.HTTP_TIMEOUT)
                    async with (
                        aiohttp.ClientSession(timeout=timeout) as session,
                        session.get(
                            cfg_client.BACKEND_PING_URL,
                        ) as resp,
                    ):
                        resp.raise_for_status()

                        await self.set_backend_live(True)
                except Exception:
                    await self.set_backend_live(False)

                finally:
                    await asyncio.sleep(1)

        self._monitor_task = asyncio.create_task(worker())
