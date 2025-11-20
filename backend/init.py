from backend.services.config_service import ConfigService


def init_config() -> None:
    ConfigService.load_config()
