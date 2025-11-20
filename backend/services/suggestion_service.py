import threading
from http import HTTPStatus

import requests
from loguru import logger

from backend.cfg.client import config as cfg_client
from backend.schemas.suggestion import GenerateSuggestionRequest, Suggestion, SuggestionState
from backend.schemas.transcript import Transcript
from backend.services.config_service import ConfigService


class SuggestionService:
    def __init__(self) -> None:
        self._suggestion: Suggestion | None = None
        self._suggestion_state: SuggestionState = SuggestionState.IDLE

        self._lock = threading.Lock()

    def get_suggestion(self) -> Suggestion | None:
        with self._lock:
            return self._suggestion

    def suggestion_state(self) -> SuggestionState:
        with self._lock:
            return self._suggestion_state

    def generate_suggestion(
        self,
        transcripts: list[Transcript],
    ) -> None:
        suggestion = []

        try:
            with self._lock:
                self._suggestion_state = SuggestionState.LOADING

            profile = ConfigService.load_config().profile

            resp = requests.post(
                cfg_client.BACKEND_SUGGESTIONS_URL,
                json=GenerateSuggestionRequest(
                    username=profile.username,
                    profile_data=profile.profile_data,
                    transcripts=transcripts,
                ).model_dump(),
                timeout=10,
            )

            if resp.status_code != HTTPStatus.OK:
                with self._lock:
                    self._suggestion_state = SuggestionState.ERROR
                return

            suggestion = Suggestion.model_validate(resp.json())
            logger.info(f"Generated suggestion: {suggestion}")

            with self._lock:
                self._suggestion = suggestion
                self._suggestion_state = SuggestionState.SUCCESS

        except Exception as ex:
            logger.error(f"Failed to generate suggestion: {ex}")
            with self._lock:
                self._suggestion_state = SuggestionState.ERROR


suggestion_service = SuggestionService()
