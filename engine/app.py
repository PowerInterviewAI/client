import contextlib
import os
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
        try:
            config_content = cfg_fs.CONFIG_FILE.read_text()
            if config_content:
                self.config = Config.model_validate_json(config_content)
            else:
                self.save_config()

        except Exception as ex:
            logger.warning(f"Failed to load config: {ex}")
            self.save_config()

        return self.config

    def save_config(self) -> None:
        json_str = self.config.model_dump_json(
            indent=2,
            ensure_ascii=True,
        )

        # Ensure directory exists
        cfg_fs.CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)

        with self._file_lock:  # thread/process safety
            tmp_fd, tmp_path = tempfile.mkstemp(
                dir=str(cfg_fs.CONFIG_FILE.parent), prefix=cfg_fs.CONFIG_FILE.name, suffix=".tmp"
            )
            try:
                # Write to temp file
                with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
                    f.write(json_str)
                    f.flush()
                    os.fsync(f.fileno())  # force write to disk

                # Backup existing config before replacing
                if cfg_fs.CONFIG_FILE.exists():
                    backup_path = cfg_fs.CONFIG_FILE.with_suffix(".bak")
                    try:
                        cfg_fs.CONFIG_FILE.replace(backup_path)
                    except Exception as ex:
                        logger.warning(f"Failed to create backup: {ex}")

                # Atomic replace
                os.replace(tmp_path, cfg_fs.CONFIG_FILE)  # noqa: PTH105

            except Exception as ex:
                logger.error(f"Failed to save config: {ex}")
                # Clean up temp file if something goes wrong
                with contextlib.suppress(Exception):
                    os.remove(tmp_path)  # noqa: PTH107

    def update_config(self, cfg: ConfigUpdate) -> Config:
        update_dict = cfg.model_dump(exclude_unset=True)
        old_dict = self.config.model_dump(exclude_unset=True)

        self.config = Config.model_validate(
            {
                **old_dict,
                **update_dict,
            }
        )
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
