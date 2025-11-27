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
        with self._file_lock:
            try:
                if not cfg_fs.CONFIG_FILE.exists():
                    self.save_config()  # create default
                    return self.config

                text = cfg_fs.CONFIG_FILE.read_text()

                # Avoid parsing empty or corrupted file
                if not text.strip():
                    logger.warning("Config file empty, restoring default.")
                    self.save_config()
                    return self.config

                self.config = Config.model_validate_json(text)
                return self.config  # noqa: TRY300

            except Exception as ex:
                logger.error(f"Failed to load config: {ex}")

                # Attempt restore from backup
                backup = cfg_fs.CONFIG_FILE.with_suffix(".bak")
                if backup.exists():
                    try:
                        cfg_fs.CONFIG_FILE.write_text(backup.read_text())
                        self.config = Config.model_validate_json(cfg_fs.CONFIG_FILE.read_text())
                        logger.warning("Config restored from backup.")
                        return self.config  # noqa: TRY300
                    except Exception as ex2:
                        logger.error(f"Backup restore failed: {ex2}")

                # Final fallback: use defaults
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
