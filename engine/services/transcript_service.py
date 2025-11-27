import copy
import json
import threading
from collections.abc import Callable
from typing import Any

from loguru import logger

from engine.cfg.fs import config as cfg_fs
from engine.schemas.app_state import RunningState
from engine.schemas.transcript import Speaker, Transcript
from engine.services.asr_service import ASRService
from engine.services.audio_service import AudioService
from engine.utils.datetime import DatetimeUtil


class Transcriber:
    def __init__(
        self,
        callback_on_self_final: Callable[[list[Transcript]], None] | None = None,
        callback_on_other_final: Callable[[list[Transcript]], None] | None = None,
    ) -> None:
        self.transcripts: list[Transcript] = []
        self.transcript_self_partial = Transcript(speaker=Speaker.SELF, text="", timestamp=0)
        self.transcript_other_partial = Transcript(speaker=Speaker.OTHER, text="", timestamp=0)

        # ASR
        self.asr_model_name: str | None = None
        self.self_asr: ASRService | None = None
        self.other_asr: ASRService | None = None

        # Callbacks
        self.callback_on_self_final = callback_on_self_final
        self.callback_on_other_final = callback_on_other_final

        # Synchronization lock
        self._lock = threading.Lock()
        self._state = RunningState.IDLE

    def start(self, input_device_index: int, asr_model_name: str) -> None:
        self.stop()

        with self._lock:
            self._state = RunningState.STARTING

        if self.self_asr is None or self.asr_model_name != asr_model_name:
            self.self_asr = ASRService(
                device_index=input_device_index,
                model_path=str(cfg_fs.MODELS_DIR / asr_model_name),
                on_final=self.on_self_final,
                on_partial=self.on_self_partial,
            )
        if self.other_asr is None or self.asr_model_name != asr_model_name:
            self.other_asr = ASRService(
                device_index=AudioService.get_loopback_device().get("index", 0),
                model_path=str(cfg_fs.MODELS_DIR / asr_model_name),
                on_final=self.on_other_final,
                on_partial=self.on_other_partial,
            )
        self.asr_model_name = asr_model_name

        self.self_asr.start(device_index=input_device_index)
        self.other_asr.start()

        with self._lock:
            self._state = RunningState.RUNNING

    def stop(self) -> None:
        def worker() -> None:
            with self._lock:
                self._state = RunningState.STOPPING

            if self.self_asr is not None:
                self.self_asr.stop()

            if self.other_asr is not None:
                self.other_asr.stop()

            with self._lock:
                self._state = RunningState.STOPPED

        threading.Thread(target=worker, daemon=True).start()

    def get_state(self) -> RunningState:
        return self._state

    def _process_partial(self, result_json: str, speaker: Speaker, partial_attr: str) -> None:
        result_dict: dict[str, Any] = json.loads(result_json)
        text: str = result_dict.get("partial", "")
        text = self.filter_transcript(text)
        if not text:
            return

        text = self.correct_text(text)

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

    def _process_final(self, result_json: str, speaker: Speaker, partial_attr: str) -> bool:
        result_dict: dict[str, Any] = json.loads(result_json)
        text: str = result_dict.get("text", "").strip()
        text = self.filter_transcript(text)
        if not text:
            return False

        # Correct errors
        final = self.correct_text(text)

        logger.debug(f"{speaker}: {final}")

        # Get the partial transcript object dynamically
        partial: Transcript = getattr(self, partial_attr)

        with self._lock:
            self.transcripts.append(
                Transcript(
                    speaker=speaker,
                    text=final,
                    timestamp=partial.timestamp or DatetimeUtil.get_current_timestamp(),
                )
            )
            # Reset the partial transcript
            setattr(self, partial_attr, Transcript(speaker=speaker, text="", timestamp=0))

        return True

    def on_self_final(self, result_json: str) -> None:
        if self._process_final(result_json, Speaker.SELF, "transcript_self_partial") and self.callback_on_self_final:
            self.callback_on_self_final(self.get_final_transcripts())

    def on_other_final(self, result_json: str) -> None:
        if self._process_final(result_json, Speaker.OTHER, "transcript_other_partial") and self.callback_on_other_final:
            self.callback_on_other_final(self.get_final_transcripts())

    def get_final_transcripts(self) -> list[Transcript]:
        with self._lock:
            final_transcripts = copy.deepcopy(self.transcripts)

        return self.merge_transcripts(final_transcripts)

    def merge_transcripts(self, transcripts: list[Transcript]) -> list[Transcript]:
        ret: list[Transcript] = []
        transcripts.sort(key=lambda t: t.timestamp)
        for t in transcripts:
            if ret and ret[-1].speaker == t.speaker:
                ret[-1].text += " " + t.text
            else:
                ret.append(t)
        return ret

    def get_transcripts(self) -> list[Transcript]:
        with self._lock:
            transcripts = copy.deepcopy(self.transcripts)

            if self.transcript_self_partial.text != "":
                transcripts.append(copy.deepcopy(self.transcript_self_partial))
            if self.transcript_other_partial.text != "":
                transcripts.append(copy.deepcopy(self.transcript_other_partial))

        return self.merge_transcripts(transcripts=transcripts)

    def clear_transcripts(self) -> None:
        with self._lock:
            self.transcripts = []
            self.transcript_self_partial = Transcript(speaker=Speaker.SELF, text="", timestamp=0)
            self.transcript_other_partial = Transcript(speaker=Speaker.OTHER, text="", timestamp=0)

    def correct_text(self, text: str) -> str:
        """Recover errors on final transcript text."""
        return text[0].upper() + text[1:].strip(".") + "."

    def filter_transcript(self, text: str) -> str | None:
        if text.lower().strip(",.!?") in [
            "",
            "the",
            "a",
            "i",
            "you",
            "he",
            "she",
            "it",
            "we",
            "they",
            "my",
            "your",
            "his",
            "her",
            "its",
            "our",
            "their",
            "who",
        ]:
            logger.warning(f"Filtered: {text}")
            return None
        return text
