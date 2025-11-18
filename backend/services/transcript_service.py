import json

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
        if self.input_asr is not None:
            self.input_asr.stop()
            self.input_asr = None

        if self.loopback_asr is not None:
            self.loopback_asr.stop()
            self.loopback_asr = None

    def on_input_partial(self, result_json: str) -> None:
        result_dict = json.loads(result_json)
        text = result_dict.get("partial", "")
        logger.debug(f"on_input_partial: {text}")
        if self.transcript_loopback_partial.text == "":
            self.transcript_loopback_partial.timestamp = DatetimeUtil.get_current_timestamp()

        self.transcript_input_partial.text = text

    def on_input_final(self, result_json: str) -> None:
        result_dict = json.loads(result_json)
        text = result_dict.get("text", "")
        logger.debug(f"on_input_final: {text}")
        self.transcripts.append(
            Transcript(
                speaker=Speaker.YOU,
                text=text,
                timestamp=self.transcript_input_partial.timestamp,
            )
        )
        self.transcript_loopback_partial.text = ""

    def on_loopback_partial(self, result_json: str) -> None:
        result_dict = json.loads(result_json)
        text = result_dict.get("partial", "")
        logger.debug(f"on_loopback_partial: {text}")
        if self.transcript_input_partial.text == "":
            self.transcript_input_partial.timestamp = DatetimeUtil.get_current_timestamp()

        self.transcript_loopback_partial.text = text

    def on_loopback_final(self, result_json: str) -> None:
        result_dict = json.loads(result_json)
        text = result_dict.get("text", "")
        logger.debug(f"on_loopback_final: {text}")
        self.transcripts.append(
            Transcript(
                speaker=Speaker.INTERVIEWER,
                text=text,
                timestamp=self.transcript_loopback_partial.timestamp,
            )
        )
        self.transcript_input_partial.text = ""


transcript_service = TranscriptService()
