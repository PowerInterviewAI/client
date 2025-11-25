from collections.abc import Callable

from loguru import logger

from engine.cfg.fs import config as cfg_fs
from engine.models.config import Config, ConfigUpdate


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
                ensure_ascii=True,
            ),
            encoding="utf-8",
        )

    @classmethod
    def update_config(
        cls,
        cfg: ConfigUpdate,
        callbacks: list[Callable[[Config], None]] | None = None,
    ) -> Config:
        update_dict = cfg.model_dump(exclude_unset=True)
        old_dict = cls._config.model_dump(exclude_unset=True)

        cls._config = Config.model_validate(
            {
                **old_dict,
                **update_dict,
            }
        )
        cls.save_config()

        if callbacks:
            for callback in callbacks:
                callback(cls._config)

        return cls._config
