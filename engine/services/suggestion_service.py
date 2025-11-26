import threading

import requests
from loguru import logger

from engine.cfg.client import config as cfg_client
from engine.models.user_profile import UserProfile
from engine.schemas.suggestion import GenerateSuggestionRequest, Suggestion, SuggestionState
from engine.schemas.transcript import Speaker, Transcript
from engine.utils.datetime import DatetimeUtil


class SuggestionService:
    def __init__(self) -> None:
        self._suggestions: dict[int, Suggestion] = {}

        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()

    def get_suggestions(self) -> list[Suggestion]:
        with self._lock:
            return list(self._suggestions.values())

    def generate_suggestion(self, transcripts: list[Transcript], profile: UserProfile) -> None:
        try:
            if not transcripts:
                return

            tstamp = DatetimeUtil.get_current_timestamp()
            with self._lock:
                self._suggestions[tstamp] = Suggestion(
                    timestamp=tstamp,
                    last_question=transcripts[-1].text,
                    answer="",
                    state=SuggestionState.PENDING,
                )

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
                    # check stop flag
                    if self._stop_event.is_set():
                        logger.info("Suggestion generation stopped by user")
                        self._suggestions[tstamp].state = SuggestionState.STOPPED
                        break

                    with self._lock:
                        self._suggestions[tstamp].state = SuggestionState.LOADING
                        if chunk:
                            self._suggestions[tstamp].answer += chunk.decode("utf-8")

            # mark as done if not stopped
            with self._lock:
                if self._suggestions[tstamp].state == SuggestionState.LOADING:
                    self._suggestions[tstamp].state = SuggestionState.SUCCESS

        except Exception as ex:
            logger.error(f"Failed to generate suggestion: {ex}")
            with self._lock:
                self._suggestions[tstamp].state = SuggestionState.ERROR

    def generate_suggestion_async(self, transcripts: list[Transcript], profile: UserProfile) -> None:
        """Spawn a background thread to run generate_suggestion."""
        # Trim trailing self transcripts
        while transcripts and transcripts[-1].speaker == Speaker.SELF:
            transcripts.pop()

        # Stop current thread
        self.stop_current_thread()

        # Start new thread
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self.generate_suggestion,
            args=(transcripts, profile),
            daemon=True,
        )
        self._thread.start()

    def stop_current_thread(self, join_timeout: float = 5.0) -> None:
        """Signal the suggestion thread to stop safely."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=join_timeout)
            if self._thread.is_alive():
                logger.warning("Suggestion thread did not stop in time")

    def clear_suggestions(self) -> None:
        with self._lock:
            self.stop_current_thread()
            self._suggestions = {}
