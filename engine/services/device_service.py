import platform
import sys
import uuid
from contextlib import suppress
from pathlib import Path

from loguru import logger

from engine.cfg.fs import config as cfg_fs
from engine.schemas.device_info import DeviceInfo


class DeviceService:
    """Utilities to obtain a unique device id and device information.

    get_unique_device_id() returns a stable, globally-unique id for this
    machine when possible. It attempts in order:
      1. Machine-specific persistent id (Linux `/etc/machine-id`)
      2. Windows MachineGuid from registry
      3. MAC address (uuid.getnode())
      4. Fallback random UUID stored in user data directory
    """

    _FALLBACK_FILE = cfg_fs.APP_DATA_DIR / "device_id"

    @staticmethod
    def _read_linux_machine_id() -> str | None:
        with suppress(Exception):
            for path in ("/etc/machine-id", "/var/lib/dbus/machine-id"):
                p = Path(path)
                if p.exists():
                    text = p.read_text().strip()
                    if text:
                        return text
        return None

    @staticmethod
    def _read_windows_machine_guid() -> str | None:
        with suppress(Exception):
            if sys.platform.startswith("win"):
                import winreg  # noqa: PLC0415

                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography")
                guid, _ = winreg.QueryValueEx(key, "MachineGuid")
                if guid:
                    return str(guid)
        return None

    @classmethod
    def _mac_based_id(cls) -> str | None:
        with suppress(Exception):
            node = uuid.getnode()
            # If getnode() returns a MAC; higher bit indicates random if set
            if (node >> 40) % 2 == 0:
                return f"mac-{node:012x}"
        return None

    @classmethod
    def _persistent_fallback(cls) -> str:
        with suppress(Exception):
            if cls._FALLBACK_FILE.exists():
                return cls._FALLBACK_FILE.read_text().strip()
            # create and persist
            val = str(uuid.uuid4())
            cls._FALLBACK_FILE.write_text(val)
            return val
        return str(uuid.uuid4())

    @classmethod
    def get_unique_device_id(cls) -> str:
        """Return a unique device id (stable when possible).

        The returned id is a hex-like string. If multiple stable sources are
        available we hash them into a namespaced UUID5 to avoid leaking raw
        ids.
        """
        sources = []

        with suppress(Exception):
            linux_id = cls._read_linux_machine_id()
            if linux_id:
                sources.append(f"linux:{linux_id}")

        with suppress(Exception):
            win_guid = cls._read_windows_machine_guid()
            if win_guid:
                sources.append(f"windows:{win_guid}")

        with suppress(Exception):
            mac = cls._mac_based_id()
            if mac:
                sources.append(mac)

        if not sources:
            # fallback persistent random id
            return cls._persistent_fallback()

        # combine sources deterministically and hash into UUID5
        name = "|".join(sorted(sources))
        # use a fixed namespace UUID for this application to get reproducible length
        ns = uuid.UUID("3c0a8f2a-9f3d-4f5e-8b1a-f4e5d8b2a6c1")
        u = uuid.uuid5(ns, name)
        return str(u)

    @classmethod
    def get_device_info(cls) -> DeviceInfo:
        """Return a `DeviceInfo` instance describing local device."""
        device_id = cls.get_unique_device_id()
        os_name = platform.system()
        arch = platform.machine() or platform.processor() or "unknown"
        plat = platform.platform()

        return DeviceInfo(device_id=device_id, os_name=os_name, arch=arch, platform=plat)


if __name__ == "__main__":
    info = DeviceService.get_device_info()
    logger.debug(f"Device Info: {info.model_dump_json(indent=2)}")
