import contextlib
import os
import shutil
import tempfile
import threading
from typing import Any

import numpy as np
from loguru import logger

from engine.cfg.fs import config as cfg_fs
from engine.cfg.video import config as cfg_video
from engine.models.config import Config, ConfigUpdate
from engine.schemas.app_state import AppState
from engine.schemas.transcript import Transcript
from engine.services.audio_service import AudioController, AudioService
from engine.services.service_monitor import ServiceMonitor
from engine.services.suggestion_service import SuggestionService
from engine.services.transcript_service import Transcriber
from engine.services.virtual_camera import VirtualCameraService


class PowerInterviewApp:
    def __init__(self) -> None:
        self._file_lock = threading.Lock()
        self.config = Config()

        self.service_status_monitor = ServiceMonitor()

        self.transcriber = Transcriber(
            callback_on_self_final=self.on_transcriber_self_final,
            callback_on_other_final=self.on_transcriber_other_final,
        )
        self.suggestion_service = SuggestionService()
        self.audio_controller = AudioController()
        self.virtual_camera_service = VirtualCameraService(
            width=cfg_video.DEFAULT_WIDTH,
            height=cfg_video.DEFAULT_HEIGHT,
            fps=cfg_video.DEFAULT_FPS,
        )

    # ---- Configuration Management ----
    def load_config(self) -> Config:
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

        with self._file_lock:
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
                            self.config = Config.model_validate_json(text)
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

        # --- Outside the lock: perform writes/restores that might re-acquire the lock ---

        if need_restore_backup and backup_data is not None:
            try:
                with self._file_lock:
                    # Overwrite the config file with the backup data
                    cfg_fs.CONFIG_FILE.write_text(backup_data)
                    # Re-parse to update in-memory config
                    self.config = Config.model_validate_json(cfg_fs.CONFIG_FILE.read_text())
                logger.warning("Config restored from backup.")
                return self.config  # noqa: TRY300

            except Exception as restore_ex:
                logger.error(f"Backup restore failed during write/parse: {restore_ex}")
                # fall through to saving defaults

        if need_save_default:
            try:
                # save_config() is expected to acquire self._file_lock internally
                self.save_config()
                logger.info("Default config saved.")
            except Exception as save_ex:
                logger.error(f"Failed to save default config: {save_ex}")
            return self.config

        if parsed_successfully:
            return self.config

        # If we got here, something unexpected happened. As a final fallback, try to return
        # current in-memory config (which may be defaults). Optionally attempt to save it.
        logger.error("load_config reached final fallback: returning in-memory config.")
        with contextlib.suppress(Exception):
            # best-effort: ensure there's a persisted config consistent with in-memory one
            self.save_config()
        return self.config

    def save_config(self) -> None:
        with self._file_lock:
            json_str = self.config.model_dump_json(indent=2, ensure_ascii=True)
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

    def update_config(self, cfg: ConfigUpdate) -> Config:
        with self._file_lock:
            merged = {
                **self.config.model_dump(),
                **cfg.model_dump(exclude_unset=True),
            }
            self.config = Config.model_validate(merged)

        self.save_config()
        return self.config

    # ---- Assistant Control ----
    def start_assistant(self) -> None:
        self.transcriber.clear_transcripts()
        self.transcriber.start(
            input_device_index=AudioService.get_device_index_by_name(self.config.audio_input_device_name),
            asr_model_name=self.config.asr_model_name,
        )

        self.suggestion_service.clear_suggestions()

        if self.config.enable_audio_control:
            self.audio_controller.update_parameters(
                input_device_id=AudioService.get_device_index_by_name(self.config.audio_input_device_name),
                output_device_id=AudioService.get_device_index_by_name(self.config.audio_control_device_name),
                delay_secs=self.config.audio_delay_ms / 1000,
            )
            self.audio_controller.start()

        if self.config.enable_video_control:
            self.virtual_camera_service.update_parameters(
                width=self.config.video_width,
                height=self.config.video_height,
                fps=cfg_video.DEFAULT_FPS,
            )
            self.virtual_camera_service.start()

    def stop_assistant(self) -> None:
        self.transcriber.stop()
        self.suggestion_service.stop_current_thread()

        self.audio_controller.stop()
        self.virtual_camera_service.stop()

    # ---- State Management ----
    def get_app_state(self) -> AppState:
        return AppState(
            assistant_state=self.transcriber.get_state(),
            transcripts=self.transcriber.get_transcripts(),
            suggestions=self.suggestion_service.get_suggestions(),
            is_backend_live=self.service_status_monitor.is_backend_live(),
        )

    # ---- Callbacks ----
    def on_transcriber_self_final(self, transcripts: list[Transcript]) -> None:
        pass

    def on_transcriber_other_final(self, transcripts: list[Transcript]) -> None:
        self.suggestion_service.generate_suggestion_async(transcripts, self.config.profile)

    def on_virtual_camera_frame(self, frame_bgr: np.ndarray[Any, Any]) -> None:
        self.virtual_camera_service.set_frame(frame_bgr)

    # ---- Background Tasks ----
    def start_background_tasks(self) -> None:
        self.service_status_monitor.start_backend_monitor()


the_app = PowerInterviewApp()
