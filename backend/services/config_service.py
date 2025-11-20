from loguru import logger

from backend.cfg.fs import config as cfg_fs
from backend.models.config import Config, ConfigUpdate
from backend.schemas.app_state import RunningState
from backend.services.transcript_service import transcriptor


class ConfigService:
    _config: Config = Config()

    @classmethod
    def load_config(cls) -> Config:
        try:
            config_content = cfg_fs.CONFIG_FILE.read_text()
            if config_content:
                cls._config = Config.model_validate_json(config_content)
            else:
                cls.save_config()

        except Exception as ex:
            logger.warning(f"Failed to load config: {ex}")
            cls.save_config()

        return cls._config

    @classmethod
    def save_config(cls) -> None:
        cfg_fs.CONFIG_FILE.write_text(
            cls._config.model_dump_json(
                indent=2,
            )
        )

    @classmethod
    def update_config(cls, cfg: ConfigUpdate) -> Config:
        update_dict = cfg.model_dump(exclude_unset=True)
        old_dict = cls._config.model_dump(exclude_unset=True)

        cls._config = Config.model_validate(
            {
                **old_dict,
                **update_dict,
            }
        )
        cls.save_config()

        if cfg.audio_input_device is not None and transcriptor.running_state() == RunningState.RUNNING:
            transcriptor.start(cfg.audio_input_device)

        return cls._config
