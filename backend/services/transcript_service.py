import copy
import json
import threading
from collections.abc import Callable
from typing import Any

from loguru import logger

from backend.schemas.app_state import RunningState
from backend.schemas.transcript import Speaker, Transcript
from backend.services.asr_service import ASRService
from backend.services.audio_service import AudioService
from backend.services.suggestion_service import suggestion_service
from backend.utils.datetime import DatetimeUtil


class TranscriptService:
    def __init__(
        self,
        callback_on_self_final: Callable[[list[Transcript]], None] | None = None,
        callback_on_other_final: Callable[[list[Transcript]], None] | None = None,
    ) -> None:
        self.transcripts: list[Transcript] = []
        self.transcript_self_partial = Transcript(speaker=Speaker.SELF, text="", timestamp=0)
        self.transcript_other_partial = Transcript(speaker=Speaker.OTHER, text="", timestamp=0)

        self.self_asr: ASRService | None = None
        self.other_asr: ASRService | None = None

        # Callbacks
        self.callback_on_self_final = callback_on_self_final
        self.callback_on_other_final = callback_on_other_final

        # Synchronization lock
        self._lock = threading.Lock()
        self._running_state = RunningState.IDLE

    def start(self, input_device_index: int) -> None:
        self.stop()

        self.clear_transcripts()

        with self._lock:
            self._running_state = RunningState.STARTING

        if self.self_asr is None:
            self.self_asr = ASRService(
                device_index=input_device_index,
                on_final=self.on_self_final,
                on_partial=self.on_self_partial,
            )
        if self.other_asr is None:
            self.other_asr = ASRService(
                device_index=AudioService.get_loopback_device().get("index", 0),
                on_final=self.on_other_final,
                on_partial=self.on_other_partial,
            )

        self.self_asr.start(device_index=input_device_index)
        self.other_asr.start()

        with self._lock:
            self._running_state = RunningState.RUNNING

    def stop(self) -> None:
        with self._lock:
            self._running_state = RunningState.STOPPING

        with self._lock:
            if self.self_asr is not None:
                self.self_asr.stop()

            if self.other_asr is not None:
                self.other_asr.stop()

            self._running_state = RunningState.STOPPED

    def running_state(self) -> RunningState:
        return self._running_state

    def _process_partial(self, result_json: str, speaker: Speaker, partial_attr: str) -> None:
        result_dict: dict[str, Any] = json.loads(result_json)
        text: str = result_dict.get("partial", "")
        if not text:
            return

        partial_transcript: Transcript = getattr(self, partial_attr)
        if partial_transcript.text == text:
            return

        logger.debug(f"{speaker}: {text}")
        with self._lock:
            if partial_transcript.timestamp == 0:
                partial_transcript.timestamp = DatetimeUtil.get_current_timestamp()
            partial_transcript.text = text

    def on_self_partial(self, result_json: str) -> None:
        self._process_partial(result_json, Speaker.SELF, "transcript_self_partial")

    def on_other_partial(self, result_json: str) -> None:
        self._process_partial(result_json, Speaker.OTHER, "transcript_other_partial")

    def _process_final(
        self,
        result_json: str,
        speaker: Speaker,
        speaker_partial_attr: str,
        counter_partial_attr: str,
    ) -> bool:
        result_dict: dict[str, Any] = json.loads(result_json)
        text: str = result_dict.get("text", "").strip()
        if not text:
            return False

        # Correct errors
        final = self.correct_text(text)

        logger.debug(f"{speaker}: {final}")

        # Get the partial transcript object dynamically
        speaker_partial: Transcript = getattr(self, speaker_partial_attr)
        counter_partial: Transcript = getattr(self, counter_partial_attr)

        with self._lock:
            if (
                self.transcripts
                and self.transcripts[-1].speaker == speaker
                and counter_partial.timestamp
                and counter_partial.timestamp > speaker_partial.timestamp
            ):
                self.transcripts[-1].text += " " + final
            else:
                self.transcripts.append(
                    Transcript(
                        speaker=speaker,
                        text=final,
                        timestamp=speaker_partial.timestamp or DatetimeUtil.get_current_timestamp(),
                    )
                )
            # Reset the partial transcript
            setattr(self, speaker_partial_attr, Transcript(speaker=speaker, text="", timestamp=0))

        return True

    def on_self_final(self, result_json: str) -> None:
        if self._process_final(result_json, Speaker.SELF, "transcript_self_partial", "transcript_other_partial"):
            with self._lock:
                transcripts = copy.deepcopy(self.transcripts)

            if self.callback_on_self_final:
                self.callback_on_self_final(transcripts)

    def on_other_final(self, result_json: str) -> None:
        if self._process_final(result_json, Speaker.OTHER, "transcript_other_partial", "transcript_self_partial"):
            with self._lock:
                transcripts = copy.deepcopy(self.transcripts)

            if self.callback_on_other_final:
                self.callback_on_other_final(transcripts)

    def get_transcripts(self) -> list[Transcript]:
        with self._lock:
            ret = copy.deepcopy(self.transcripts)

            partials: list[Transcript] = []
            if self.transcript_self_partial.text != "":
                partials.append(copy.deepcopy(self.transcript_self_partial))
            if self.transcript_other_partial.text != "":
                partials.append(copy.deepcopy(self.transcript_other_partial))

            partials.sort(key=lambda t: t.timestamp)

            if partials:
                ret.extend(partials)

            ret.sort(key=lambda t: t.timestamp)

            return ret

    def clear_transcripts(self) -> None:
        with self._lock:
            self.transcripts = []
            self.transcript_self_partial = Transcript(speaker=Speaker.SELF, text="", timestamp=0)
            self.transcript_other_partial = Transcript(speaker=Speaker.OTHER, text="", timestamp=0)

    def correct_text(self, text: str) -> str:
        """Recover errors on final transcript text."""
        normalized = text[0].upper() + text[1:]
        if not normalized.endswith("."):
            normalized += "."
        return normalized


transcriptor = TranscriptService(
    callback_on_other_final=suggestion_service.generate_suggestion_async,
)
