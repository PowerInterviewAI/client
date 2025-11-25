from loguru import logger

from app.cfg.fs import config as cfg_fs
from app.models.config import Config, ConfigUpdate
from app.schemas.app_state import AppState
from app.services.audio_service import AUDIO_CONTROL_SERVICE, AudioControlService
from app.services.service_status_manager import SETVICE_STATUS_MANAGER
from app.services.suggestion_service import SUGGESTION_SERVICE
from app.services.transcript_service import TRANSCRIPT_SERVICE


class PowerInterviewApp:
    def __init__(self) -> None:
        self.config = self.load_config()

        self.audio_controller = AudioControlService()

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
        TRANSCRIPT_SERVICE.start(
            input_device_index=self.config.audio_input_device,
            asr_model_name=self.config.asr_model,
        )
        SUGGESTION_SERVICE.start_suggestion()

        if self.config.enable_audio_control:
            AUDIO_CONTROL_SERVICE.start(
                input_device_id=self.config.audio_input_device,
                output_device_id=self.config.audio_control_device,
                delay_secs=self.config.audio_delay_ms / 1000,
            )

    def stop_assistant(self) -> None:
        TRANSCRIPT_SERVICE.stop()
        SUGGESTION_SERVICE.stop_suggestion()

    # ---- State Management ----
    def get_app_state(self) -> AppState:
        return AppState(
            transcripts=TRANSCRIPT_SERVICE.get_transcripts(),
            running_state=TRANSCRIPT_SERVICE.running_state(),
            suggestions=SUGGESTION_SERVICE.get_suggestions(),
            is_backend_live=SETVICE_STATUS_MANAGER.is_backend_live(),
        )


the_app = PowerInterviewApp()
