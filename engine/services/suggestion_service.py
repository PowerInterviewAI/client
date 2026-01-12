import threading

from loguru import logger

from engine.api.error_handler import raise_for_status
from engine.cfg.client import config as cfg_client
from engine.models.interview_conf import InterviewConf
from engine.schemas.suggestion import GenerateSuggestionRequest, Suggestion, SuggestionState
from engine.schemas.transcript import Speaker, Transcript
from engine.services.web_client import WebClient
from engine.utils.datetime import DatetimeUtil


class SuggestionService:
    def __init__(self) -> None:
        self._suggestions: dict[int, Suggestion] = {}
        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()

    # --------------------------
    # Public API
    # --------------------------

    def get_suggestions(self) -> list[Suggestion]:
        with self._lock:
            return list(self._suggestions.values())

    def clear_suggestions(self) -> None:
        self.stop_current_task()
        with self._lock:
            self._suggestions.clear()

    def generate_suggestion(
        self,
        transcripts: list[Transcript],
        profile: InterviewConf,
    ) -> None:
        """The main worker to call backend and stream response."""
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

        try:
            resp = WebClient.post(
                cfg_client.BACKEND_SUGGESTIONS_URL,
                json=GenerateSuggestionRequest(
                    username=profile.username,
                    profile_data=profile.profile_data,
                    transcripts=transcripts,
                ).model_dump(),
            )
            raise_for_status(resp)

            for chunk in resp.iter_content(chunk_size=1024):
                # handle stop request
                if self._stop_event.is_set():
                    logger.info("Suggestion generation stopped by user")
                    with self._lock:
                        self._suggestions[tstamp].state = SuggestionState.STOPPED
                    return

                if chunk:
                    decoded = chunk.decode("utf-8")
                    with self._lock:
                        self._suggestions[tstamp].state = SuggestionState.LOADING
                        self._suggestions[tstamp].answer += decoded

            # mark as done if not stopped
            with self._lock:
                if self._suggestions[tstamp].state == SuggestionState.LOADING:
                    self._suggestions[tstamp].state = SuggestionState.SUCCESS

        except Exception as ex:
            logger.error(f"Failed to generate suggestion: {ex}")
            with self._lock:
                self._suggestions[tstamp].state = SuggestionState.ERROR

    def generate_suggestion_async(
        self,
        transcripts: list[Transcript],
        profile: InterviewConf,
    ) -> None:
        """Spawn a background thread to run generate_suggestion."""
        # Remove trailing SELF transcripts
        while transcripts and transcripts[-1].speaker == Speaker.SELF:
            transcripts.pop()
        if not transcripts:
            return

        # cancel the current thread if running
        self.stop_current_task()

        # clear the stop signal
        self._stop_event.clear()

        # start new thread
        self._thread = threading.Thread(target=self.generate_suggestion, args=(transcripts, profile))
        self._thread.start()

    def stop_current_task(self) -> None:
        """Signal the suggestion thread to stop safely."""
        self._stop_event.set()

        if self._thread and self._thread.is_alive():
            self._thread.join()  # wait for thread to finish
            self._thread = None
