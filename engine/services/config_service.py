import contextlib
import os
import shutil
import tempfile
import threading

from loguru import logger

from engine.cfg.fs import config as cfg_fs
from engine.models.config import Config, ConfigUpdate


class ConfigService:
    _file_lock = threading.Lock()
    config = Config()

    @classmethod
    def load_config(cls) -> Config:
        """
        Load configuration from disk in a thread-safe way.

        - Only take decisions while holding self._file_lock.
        - Perform any action that may re-acquire the same lock (save/restore) AFTER releasing the lock.
        - Return the final config at the end.
        """
        need_save_default = False
        need_restore_backup = False
        backup_data = None
        parsed_successfully = False

        with cls._file_lock:
            try:
                if not cfg_fs.CONFIG_FILE.exists():
                    # file missing -> create default after releasing lock
                    need_save_default = True
                else:
                    text = cfg_fs.CONFIG_FILE.read_text()
                    if not text.strip():
                        logger.warning("Config file empty, will restore defaults.")
                        need_save_default = True
                    else:
                        # Try parsing; parsing errors are handled here
                        try:
                            cls.config = Config.model_validate_json(text)
                            parsed_successfully = True
                        except Exception as parse_ex:
                            logger.error(f"Failed to parse config: {parse_ex}")

                            # Try to prepare to restore from backup (read backup while still under lock)
                            backup = cfg_fs.CONFIG_FILE.with_suffix(".bak")
                            if backup.exists():
                                try:
                                    backup_data = backup.read_text()
                                    need_restore_backup = True
                                except Exception as backup_read_ex:
                                    logger.error(f"Failed to read backup file: {backup_read_ex}")
                                    # If backup read fails, fall back to saving defaults
                                    need_save_default = True
                            else:
                                # No backup available, we'll save defaults
                                need_save_default = True

            except Exception as read_ex:
                # Any I/O error while checking/reading file
                logger.error(f"Failed to read config file: {read_ex}")

                # Try to prepare to restore from backup
                backup = cfg_fs.CONFIG_FILE.with_suffix(".bak")
                if backup.exists():
                    try:
                        backup_data = backup.read_text()
                        need_restore_backup = True
                    except Exception as backup_read_ex:
                        logger.error(f"Failed to read backup file: {backup_read_ex}")
                        need_save_default = True
                else:
                    need_save_default = True

        # --- Outside the lock: perform writes/restores that might re-acquire the same lock ---

        if need_restore_backup and backup_data is not None:
            try:
                with cls._file_lock:
                    # Overwrite the config file with the backup data
                    cfg_fs.CONFIG_FILE.write_text(backup_data)
                    # Re-parse to update in-memory config
                    cls.config = Config.model_validate_json(cfg_fs.CONFIG_FILE.read_text())
                logger.warning("Config restored from backup.")
                return cls.config  # noqa: TRY300

            except Exception as restore_ex:
                logger.error(f"Backup restore failed during write/parse: {restore_ex}")
                # fall through to saving defaults

        if need_save_default:
            try:
                # save_config() is expected to acquire self._file_lock internally
                cls.save_config()
                logger.info("Default config saved.")
            except Exception as save_ex:
                logger.error(f"Failed to save default config: {save_ex}")
            return cls.config

        if parsed_successfully:
            return cls.config

        # If we got here, something unexpected happened. As a final fallback, try to return
        # current in-memory config (which may be defaults). Optionally attempt to save it.
        logger.error("load_config reached final fallback: returning in-memory config.")
        with contextlib.suppress(Exception):
            # best-effort: ensure there's a persisted config consistent with in-memory one
            cls.save_config()
        return cls.config

    @classmethod
    def save_config(cls) -> None:
        with cls._file_lock:
            json_str = cls.config.model_dump_json(indent=2, ensure_ascii=True)
            cfg_fs.CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)

            fd, tmp_path = tempfile.mkstemp(
                dir=str(cfg_fs.CONFIG_FILE.parent),
                prefix=cfg_fs.CONFIG_FILE.name,
                suffix=".tmp",
            )

            try:
                with os.fdopen(fd, "w", encoding="utf-8") as f:
                    f.write(json_str)
                    f.flush()
                    os.fsync(f.fileno())

                # Create backup only once per successful save
                if cfg_fs.CONFIG_FILE.exists():
                    backup = cfg_fs.CONFIG_FILE.with_suffix(".bak")
                    shutil.copy2(cfg_fs.CONFIG_FILE, backup)

                os.replace(tmp_path, cfg_fs.CONFIG_FILE)  # noqa: PTH105

            except Exception as ex:
                logger.error(f"Failed to save config: {ex}")
                with contextlib.suppress(Exception):
                    os.remove(tmp_path)  # noqa: PTH107
                raise

    @classmethod
    def update_config(cls, cfg: ConfigUpdate) -> Config:
        with cls._file_lock:
            merged = {
                **cls.config.model_dump(),
                **cfg.model_dump(exclude_unset=True),
            }
            cls.config = Config.model_validate(merged)

        cls.save_config()
        return cls.config
