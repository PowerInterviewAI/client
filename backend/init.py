from backend.services.app_config_service import AppStateService


def init_app_state() -> None:
    AppStateService.load_app_state()
