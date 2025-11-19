from loguru import logger

from backend.cfg.fs import config as cfg_fs
from backend.models.app_state import AppState, AppStateUpdate
from backend.schemas.running_state import RunningState
from backend.services.transcript_service import transcriptor


class AppStateService:
    _app_config: AppState = AppState()

    @classmethod
    def get_app_state(cls) -> AppState:
        return cls._app_config

    @classmethod
    def load_app_state(cls) -> AppState:
        try:
            state_content = cfg_fs.APP_STATE_FILE.read_text()
            if state_content:
                cls._app_config = AppState.model_validate_json(state_content)
            else:
                cls.save_app_state()

        except Exception as ex:
            logger.warning(f"Failed to load app state: {ex}")
            cls.save_app_state()

        return cls._app_config

    @classmethod
    def save_app_state(cls) -> None:
        cfg_fs.APP_STATE_FILE.write_text(
            cls._app_config.model_dump_json(
                indent=2,
            )
        )

    @classmethod
    def update_app_state(cls, cfg: AppStateUpdate) -> AppState:
        update_dict = cfg.model_dump(exclude_unset=True)
        old_dict = cls._app_config.model_dump(exclude_unset=True)

        cls._app_config = AppState.model_validate(
            {
                **old_dict,
                **update_dict,
            }
        )
        cls.save_app_state()

        if cfg.audio_input_device is not None and transcriptor.running_state() == RunningState.RUNNING:
            transcriptor.start(cfg.audio_input_device)

        return cls._app_config
