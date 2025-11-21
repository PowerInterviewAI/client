import threading

import requests
from loguru import logger

from backend.cfg.client import config as cfg_client
from backend.schemas.suggestion import GenerateSuggestionRequest, Suggestion, SuggestionState
from backend.schemas.transcript import Transcript
from backend.services.config_service import ConfigService
from backend.utils.datetime import DatetimeUtil


class SuggestionService:
    def __init__(self) -> None:
        self._suggestions: dict[int, Suggestion] = {}

        self._lock = threading.Lock()
        self._stop_event = threading.Event()

    def get_suggestions(self) -> list[Suggestion]:
        with self._lock:
            return self._suggestions.values()

    def generate_suggestion(self, transcripts: list[Transcript]) -> None:
        try:
            tstamp = DatetimeUtil.get_current_timestamp()
            with self._lock:
                self._suggestions[tstamp] = Suggestion(
                    timestamp=tstamp,
                    last_question=transcripts[-1].text,
                    answer="",
                    state=SuggestionState.PENDING,
                )

            profile = ConfigService.load_config().profile

            with requests.post(
                cfg_client.BACKEND_SUGGESTIONS_URL,
                json=GenerateSuggestionRequest(
                    username=profile.username,
                    profile_data=profile.profile_data,
                    transcripts=transcripts,
                ).model_dump(),
                timeout=10,
                stream=True,
            ) as resp:
                resp.raise_for_status()

                for chunk in resp.iter_content(chunk_size=None):
                    with self._lock:
                        self._suggestions[tstamp].state = SuggestionState.LOADING

                    # check stop flag
                    if self._stop_event.is_set():
                        logger.info("Suggestion generation stopped by user")
                        self._suggestions[tstamp].state = SuggestionState.STOPPED
                        break

                    if chunk:
                        with self._lock:
                            self._suggestions[tstamp].answer += chunk.decode("utf-8")

            # mark as done if not stopped
            with self._lock:
                if not self._stop_event.is_set():
                    self._suggestions[tstamp].state = SuggestionState.SUCCESS
                else:
                    self._suggestions[tstamp].state = SuggestionState.IDLE

        except Exception as ex:
            logger.error(f"Failed to generate suggestion: {ex}")
            with self._lock:
                self._suggestions[tstamp].state = SuggestionState.ERROR

    def generate_suggestion_async(self, transcripts: list[Transcript]) -> None:
        """Spawn a background thread to run generate_suggestion."""
        if self._stop_event.is_set():
            return

        threading.Thread(
            target=self.generate_suggestion,
            args=(transcripts,),
            daemon=True,
        ).start()

    def start_suggestion(self) -> None:
        """Signal the suggestion thread to start."""
        self._stop_event.clear()
        suggestion_service.clear_suggestions()
        logger.info("Start signal sent to suggestion thread")

    def stop_suggestion(self) -> None:
        """Signal the suggestion thread to stop safely."""
        self._stop_event.set()
        logger.info("Stop signal sent to suggestion thread")

    def clear_suggestions(self) -> None:
        with self._lock:
            self._suggestions = {}


suggestion_service = SuggestionService()
