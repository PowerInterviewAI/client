import copy
import json
import threading
from typing import Any

from loguru import logger

from backend.schemas.running_state import RunningState
from backend.schemas.transcript import Speaker, Transcript
from backend.services.asr_service import ASRService
from backend.services.audio_service import AudioService
from backend.utils.datetime import DatetimeUtil


class TranscriptService:
    def __init__(self) -> None:
        self.transcripts: list[Transcript] = []
        self.transcript_input_partial = Transcript(speaker=Speaker.YOU, text="", timestamp=0)
        self.transcript_loopback_partial = Transcript(speaker=Speaker.INTERVIEWER, text="", timestamp=0)

        self.input_asr: ASRService | None = None
        self.loopback_asr: ASRService | None = None

        # Synchronization lock
        self._lock = threading.Lock()
        self._running_state = RunningState.IDLE

    def start(self, input_device_index: int) -> None:
        self.stop()

        with self._lock:
            self._running_state = RunningState.STARTING

        if self.input_asr is None:
            self.input_asr = ASRService(
                device_index=input_device_index,
                on_final=self.on_input_final,
                on_partial=self.on_input_partial,
            )
        if self.loopback_asr is None:
            self.loopback_asr = ASRService(
                device_index=AudioService.get_loopback_device().get("index", 0),
                on_final=self.on_loopback_final,
                on_partial=self.on_loopback_partial,
            )

        self.input_asr.start(device_index=input_device_index)
        self.loopback_asr.start()

        with self._lock:
            self._running_state = RunningState.RUNNING

    def stop(self) -> None:
        with self._lock:
            self._running_state = RunningState.STOPPING

        with self._lock:
            if self.input_asr is not None:
                self.input_asr.stop()

            if self.loopback_asr is not None:
                self.loopback_asr.stop()

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

    def on_input_partial(self, result_json: str) -> None:
        self._process_partial(result_json, Speaker.YOU, "transcript_input_partial")

    def on_loopback_partial(self, result_json: str) -> None:
        self._process_partial(result_json, Speaker.INTERVIEWER, "transcript_loopback_partial")

    def _process_final(self, result_json: str, speaker: Speaker, partial_attr: str) -> None:
        result_dict: dict[str, Any] = json.loads(result_json)
        text: str = result_dict.get("text", "").strip()
        if not text:
            return

        # Normalize text
        final = text[0].upper() + text[1:]
        if not final.endswith("."):
            final += "."

        logger.debug(f"{speaker}: {final}")

        # Get the partial transcript object dynamically
        partial_transcript: Transcript = getattr(self, partial_attr)

        with self._lock:
            if self.transcripts and self.transcripts[-1].speaker == speaker:
                self.transcripts[-1].text += " " + final
            else:
                self.transcripts.append(
                    Transcript(
                        speaker=speaker,
                        text=final,
                        timestamp=partial_transcript.timestamp or DatetimeUtil.get_current_timestamp(),
                    )
                )
            # Reset the partial transcript
            setattr(self, partial_attr, Transcript(speaker=speaker, text="", timestamp=0))

    def on_input_final(self, result_json: str) -> None:
        self._process_final(result_json, Speaker.YOU, "transcript_input_partial")

    def on_loopback_final(self, result_json: str) -> None:
        self._process_final(result_json, Speaker.INTERVIEWER, "transcript_loopback_partial")

    def get_transcripts(self) -> list[Transcript]:
        with self._lock:
            ret = copy.deepcopy(self.transcripts)

            partials: list[Transcript] = []
            if self.transcript_input_partial.text != "":
                partials.append(copy.deepcopy(self.transcript_input_partial))
            if self.transcript_loopback_partial.text != "":
                partials.append(copy.deepcopy(self.transcript_loopback_partial))

            partials.sort(key=lambda t: t.timestamp)

            if partials:
                ret.extend(partials)

            ret.sort(key=lambda t: t.timestamp)

            return ret


transcriptor = TranscriptService()
