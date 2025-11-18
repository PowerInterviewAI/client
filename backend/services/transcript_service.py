import copy
import json
import threading

from loguru import logger

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

    def start(self, input_device_index: int) -> None:
        self.stop()

        self.input_asr = ASRService(
            device_index=input_device_index,
            on_final=self.on_input_final,
            on_partial=self.on_input_partial,
        )
        self.loopback_asr = ASRService(
            device_index=AudioService.get_loopback_device().get("index", 0),
            on_final=self.on_loopback_final,
            on_partial=self.on_loopback_partial,
        )

        self.input_asr.start()
        self.loopback_asr.start()

    def stop(self) -> None:
        with self._lock:
            if self.input_asr is not None:
                self.input_asr.stop()
                self.input_asr = None

            if self.loopback_asr is not None:
                self.loopback_asr.stop()
                self.loopback_asr = None

    def on_input_partial(self, result_json: str) -> None:
        result_dict = json.loads(result_json)
        text = result_dict.get("partial", "")
        if not text:
            return

        logger.debug(f"on_input_partial: {text}")
        with self._lock:
            if self.transcript_input_partial.timestamp == 0:
                self.transcript_input_partial.timestamp = DatetimeUtil.get_current_timestamp()
            self.transcript_input_partial.text = text

    def on_loopback_partial(self, result_json: str) -> None:
        result_dict = json.loads(result_json)
        text = result_dict.get("partial", "")
        if not text:
            return

        logger.debug(f"on_loopback_partial: {text}")
        with self._lock:
            if self.transcript_loopback_partial.timestamp == 0:
                self.transcript_loopback_partial.timestamp = DatetimeUtil.get_current_timestamp()
            self.transcript_loopback_partial.text = text

    def on_input_final(self, result_json: str) -> None:
        result_dict = json.loads(result_json)
        text: str = result_dict.get("text", "").strip()
        if not text:
            return

        final = text
        final = final[0].upper() + final[1:]
        if not final.endswith("."):
            final += "."

        logger.debug(f"on_input_final: {final}")
        with self._lock:
            self.transcripts.append(
                Transcript(
                    speaker=Speaker.YOU,
                    text=final,
                    timestamp=self.transcript_input_partial.timestamp or DatetimeUtil.get_current_timestamp(),
                )
            )
            self.transcript_input_partial = Transcript(speaker=Speaker.YOU, text="", timestamp=0)

    def on_loopback_final(self, result_json: str) -> None:
        result_dict = json.loads(result_json)
        text: str = result_dict.get("text", "").strip()
        if not text:
            return

        final = text
        final = final[0].upper() + final[1:]
        if not final.endswith("."):
            final += "."

        logger.debug(f"on_loopback_final: {final}")
        with self._lock:
            self.transcripts.append(
                Transcript(
                    speaker=Speaker.INTERVIEWER,
                    text=final,
                    timestamp=self.transcript_loopback_partial.timestamp or DatetimeUtil.get_current_timestamp(),
                )
            )
            self.transcript_loopback_partial = Transcript(speaker=Speaker.INTERVIEWER, text="", timestamp=0)

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
