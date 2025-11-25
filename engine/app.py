from typing import Any

import numpy as np
from loguru import logger

from engine.cfg.fs import config as cfg_fs
from engine.cfg.video import config as cfg_video
from engine.models.config import Config, ConfigUpdate
from engine.schemas.app_state import AppState
from engine.schemas.transcript import Transcript
from engine.services.audio_service import AudioController
from engine.services.service_status_manager import SETVICE_STATUS_MANAGER
from engine.services.suggestion_service import SuggestionService
from engine.services.transcript_service import Transcriber
from engine.services.virtual_camera import VirtualCameraService


class PowerInterviewApp:
    def __init__(self) -> None:
        self.config = Config()

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
        cfg_fs.CONFIG_FILE.write_text(
            self.config.model_dump_json(
                indent=2,
                ensure_ascii=True,
            ),
            encoding="utf-8",
        )

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
        self.transcriber.start(
            input_device_index=self.config.audio_input_device,
            asr_model_name=self.config.asr_model,
        )
        self.suggestion_service.start_suggestion()

        if self.config.enable_audio_control:
            self.audio_controller.start(
                input_device_id=self.config.audio_input_device,
                output_device_id=self.config.audio_control_device,
                delay_secs=self.config.audio_delay_ms / 1000,
            )

        if self.config.enable_video_control:
            self.virtual_camera_service.update_parameters(
                width=self.config.video_width,
                height=self.config.video_height,
                fps=cfg_video.DEFAULT_FPS,
            )
            self.virtual_camera_service.start()

    def stop_assistant(self) -> None:
        self.transcriber.stop()
        self.suggestion_service.stop_suggestion()

        self.audio_controller.stop()
        self.virtual_camera_service.stop()

    # ---- State Management ----
    def get_app_state(self) -> AppState:
        return AppState(
            transcripts=self.transcriber.get_transcripts(),
            running_state=self.transcriber.running_state(),
            suggestions=self.suggestion_service.get_suggestions(),
            is_backend_live=SETVICE_STATUS_MANAGER.is_backend_live(),
        )

    # ---- Callbacks ----
    def on_transcriber_self_final(self, transcripts: list[Transcript]) -> None:
        pass

    def on_transcriber_other_final(self, transcripts: list[Transcript]) -> None:
        self.suggestion_service.generate_suggestion_async(transcripts, self.config.profile)

    def on_virtual_camera_frame(self, frame_bgr: np.ndarray[Any, Any]) -> None:
        self.virtual_camera_service.set_frame(frame_bgr)


the_app = PowerInterviewApp()
