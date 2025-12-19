import asyncio
from typing import Any

from aiohttp import ClientSession
from loguru import logger

from engine.api.error_handler import raise_for_status_async
from engine.cfg.client import config as cfg_client
from engine.models.user_profile import UserProfile
from engine.schemas.suggestion import GenerateSuggestionRequest, Suggestion, SuggestionState
from engine.schemas.transcript import Speaker, Transcript
from engine.utils.datetime import DatetimeUtil


class SuggestionService:
    def __init__(self) -> None:
        self._suggestions: dict[int, Suggestion] = {}
        self._lock = asyncio.Lock()
        self._task: asyncio.Task[Any] | None = None
        self._stop_event = asyncio.Event()

    # --------------------------
    # Public API
    # --------------------------

    async def get_suggestions(self) -> list[Suggestion]:
        async with self._lock:
            return list(self._suggestions.values())

    async def clear_suggestions(self) -> None:
        await self.stop_current_task()
        async with self._lock:
            self._suggestions.clear()

    async def generate_suggestion(
        self,
        client_session: ClientSession,
        transcripts: list[Transcript],
        profile: UserProfile,
    ) -> None:
        """The main async worker to call backend and stream response."""
        if not transcripts:
            return

        tstamp = DatetimeUtil.get_current_timestamp()
        async with self._lock:
            self._suggestions[tstamp] = Suggestion(
                timestamp=tstamp,
                last_question=transcripts[-1].text,
                answer="",
                state=SuggestionState.PENDING,
            )

        try:
            async with client_session.post(
                cfg_client.BACKEND_SUGGESTIONS_URL,
                json=GenerateSuggestionRequest(
                    username=profile.username,
                    profile_data=profile.profile_data,
                    transcripts=transcripts,
                ).model_dump(),
            ) as resp:
                await raise_for_status_async(resp)

                async for chunk, _ in resp.content.iter_chunks():
                    # handle stop request
                    if self._stop_event.is_set():
                        logger.info("Suggestion generation stopped by user")
                        async with self._lock:
                            self._suggestions[tstamp].state = SuggestionState.STOPPED
                        return

                    if chunk:
                        decoded = chunk.decode("utf-8")
                        async with self._lock:
                            self._suggestions[tstamp].state = SuggestionState.LOADING
                            self._suggestions[tstamp].answer += decoded

            # mark as done if not stopped
            async with self._lock:
                if self._suggestions[tstamp].state == SuggestionState.LOADING:
                    self._suggestions[tstamp].state = SuggestionState.SUCCESS

        except Exception as ex:
            logger.error(f"Failed to generate suggestion: {ex}")
            async with self._lock:
                self._suggestions[tstamp].state = SuggestionState.ERROR

    async def generate_suggestion_async(
        self,
        client_session: ClientSession,
        transcripts: list[Transcript],
        profile: UserProfile,
    ) -> None:
        """Spawn a background asyncio Task to run generate_suggestion."""
        # Remove trailing SELF transcripts
        while transcripts and transcripts[-1].speaker == Speaker.SELF:
            transcripts.pop()
        if not transcripts:
            return

        # cancel the current task if running
        await self.stop_current_task()

        # clear the stop signal
        self._stop_event.clear()

        # start new task
        self._task = asyncio.create_task(self.generate_suggestion(client_session, transcripts, profile))

    async def stop_current_task(self) -> None:
        """Signal the suggestion task to stop safely."""
        self._stop_event.set()

        if self._task:
            # cancel if still running
            if not self._task.done():
                try:
                    await self._task  # wait for task to finish
                except asyncio.CancelledError:
                    logger.debug("Suggestion task cancelled")
            self._task = None
