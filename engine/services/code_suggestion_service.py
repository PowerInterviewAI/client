import threading

from loguru import logger

from engine.api.error_handler import raise_for_status
from engine.cfg.client import config as cfg_client
from engine.schemas.suggestion import CodeSuggestion, GenerateCodeSuggestionRequest, SuggestionState
from engine.services.web_client import WebClient
from engine.utils.datetime import DatetimeUtil


class CodeSuggestionService:
    def __init__(self) -> None:
        # uploaded image filenames (server-side)
        self._uploaded_image_names: list[str] = []
        self._user_prompt: str | None = None

        self._suggestions: dict[int, CodeSuggestion] = {}

        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()

    # --------------------------
    # Public API
    # --------------------------

    def get_suggestions(self) -> list[CodeSuggestion]:
        with self._lock:
            pending_prompt = CodeSuggestion(
                timestamp=DatetimeUtil.get_current_timestamp(),
                image_names=self._uploaded_image_names,
                user_prompt=self._user_prompt,
                suggestion_content="",
                state=SuggestionState.IDLE,
            )
            return (
                [
                    pending_prompt,
                    *list(self._suggestions.values()),
                ]
                if self._user_prompt or self._uploaded_image_names
                else list(self._suggestions.values())
            )

    def clear_suggestions(self) -> None:
        self.stop_current_task()
        with self._lock:
            self._suggestions.clear()
            self._uploaded_image_names.clear()
            self._user_prompt = None

    def add_image(self, image_bytes: bytes) -> None:
        """Add an image in bytes to the list of images for code suggestion."""
        # upload image to backend as multipart file and save returned filename (plain text)
        files = {"image_file": ("screenshot.png", image_bytes, "application/octet-stream")}
        try:
            resp = WebClient.post_file(cfg_client.BACKEND_UPLOAD_IMAGE_URL, files=files)
            raise_for_status(resp)

            name = resp.text.strip()
            if not name:
                msg = f"Unexpected upload response: {resp.text}"
                raise RuntimeError(msg)  # noqa: TRY301

            with self._lock:
                self._uploaded_image_names.append(name)

        except Exception as ex:
            logger.error(f"Failed to upload image for suggestion: {ex}")
            raise

    def set_user_prompt(self, prompt: str) -> None:
        """Set the user prompt for code suggestion."""
        with self._lock:
            self._user_prompt = prompt

    def generate_code_suggestion(self) -> None:
        """Call backend to generate a code suggestion and stream the response into the suggestion record."""
        tstamp = DatetimeUtil.get_current_timestamp()
        with self._lock:
            payload = GenerateCodeSuggestionRequest(
                user_prompt=self._user_prompt,
                image_names=self._uploaded_image_names,
            ).model_dump(mode="json")

            self._suggestions[tstamp] = CodeSuggestion(
                timestamp=tstamp,
                image_names=self._uploaded_image_names,
                user_prompt=self._user_prompt,
                suggestion_content="",
                state=SuggestionState.PENDING,
            )

            # clear uploaded lists and prompt (they are now part of the suggestion)
            self._uploaded_image_names.clear()
            self._user_prompt = None

        try:
            url = cfg_client.BACKEND_CODE_SUGGESTIONS_URL
            resp = WebClient.post(url, json=payload)
            raise_for_status(resp)

            for chunk in resp.iter_content(chunk_size=1024):
                if self._stop_event.is_set():
                    logger.info("Code suggestion generation stopped by user")
                    with self._lock:
                        self._suggestions[tstamp].state = SuggestionState.STOPPED
                    return

                if chunk:
                    decoded = chunk.decode("utf-8")
                    with self._lock:
                        self._suggestions[tstamp].state = SuggestionState.LOADING
                        self._suggestions[tstamp].suggestion_content += decoded

            # mark as done if not stopped
            with self._lock:
                if self._suggestions[tstamp].state == SuggestionState.LOADING:
                    self._suggestions[tstamp].state = SuggestionState.SUCCESS

        except Exception as ex:
            logger.error(f"Failed to generate code suggestion: {ex}")
            with self._lock:
                self._suggestions[tstamp].state = SuggestionState.ERROR

    def generate_code_suggestion_async(self) -> None:
        """Spawn a background thread to run generate_code_suggestion."""
        if not self._uploaded_image_names and not self._user_prompt:
            return

        # cancel the current thread if running
        self.stop_current_task()

        # clear stop signal
        self._stop_event.clear()

        # start new thread
        self._thread = threading.Thread(target=self.generate_code_suggestion)
        self._thread.start()

    def stop_current_task(self) -> None:
        """Signal the suggestion thread to stop safely."""
        self._stop_event.set()

        if self._thread and self._thread.is_alive():
            self._thread.join()
            self._thread = None
