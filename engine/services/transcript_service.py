import copy
import threading
from collections.abc import Callable

from loguru import logger

from engine.cfg.client import config as cfg_client
from engine.schemas.app_state import RunningState
from engine.schemas.transcript import Speaker, Transcript
from engine.services.asr_service import ASRService
from engine.services.audio_device_service import AudioDeviceService
from engine.services.audio_record_service import AudioLoopbackRecordService, AudioRecordService
from engine.services.config_service import ConfigService
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
        self.self_asr: ASRService | None = None
        self.other_asr: ASRService | None = None

        # Audio recorders
        self.self_audio_recorder: AudioRecordService | None = None
        # Start other audio recorder (system loopback) immediately in constructor
        self.other_audio_recorder: AudioLoopbackRecordService = AudioLoopbackRecordService()
        self.other_audio_recorder.start()

        # Callbacks
        self.callback_on_self_final = callback_on_self_final
        self.callback_on_other_final = callback_on_other_final

        # Synchronization lock (thread-safe because callbacks may be invoked from non-async contexts)
        self._lock = threading.Lock()
        self._state = RunningState.IDLE

    def start(self, session_token: str | None = None) -> None:
        """
        Sync start: stops any running services, (re)creates ASRService instances if needed,
        and starts them. Both ASR services now use loopback recording.
        """
        # Stop existing services first
        self.stop()

        with self._lock:
            self._state = RunningState.STARTING

        # Ensure previous instances are stopped (defensive)
        if self.self_asr is not None:
            try:
                self.self_asr.stop()
            except Exception:
                logger.exception("Error stopping previous self_asr during start()")

        if self.other_asr is not None:
            try:
                self.other_asr.stop()
            except Exception:
                logger.exception("Error stopping previous other_asr during start()")

        # Create or recreate ASRService instances if model changed or missing
        if self.self_asr is None:
            self.self_asr = ASRService(
                ws_uri=cfg_client.BACKEND_ASR_STREAMING_URL,
                on_final=self.on_self_final,
                on_partial=self.on_self_partial,
            )

        if self.other_asr is None:
            self.other_asr = ASRService(
                ws_uri=cfg_client.BACKEND_ASR_STREAMING_URL,
                on_final=self.on_other_final,
                on_partial=self.on_other_partial,
            )

        # Create audio recorders
        # self_asr uses microphone input, other_asr uses system loopback (already started in constructor)
        input_device_index = AudioDeviceService.get_device_index_by_name(ConfigService.config.audio_input_device_name)
        self.self_audio_recorder = AudioRecordService(device_index=input_device_index)

        # Start self audio recorder and clear other audio recorder queue
        self.self_audio_recorder.start()
        self.other_audio_recorder.clear_queue()

        # Start both ASR services
        try:
            if self.self_asr is not None:
                self.self_asr.start(audio_recorder=self.self_audio_recorder, session_token=session_token)
            if self.other_asr is not None:
                self.other_asr.start(audio_recorder=self.other_audio_recorder, session_token=session_token)
        except Exception:
            logger.exception("Failed to start ASR services")
            # If start failed, ensure we set state appropriately and re-raise
            with self._lock:
                self._state = RunningState.STOPPED
            raise

        with self._lock:
            self._state = RunningState.RUNNING

    def stop(self) -> None:
        """
        Sync stop: stops both ASR services and updates state.
        Safe to call multiple times.
        """
        with self._lock:
            # If already stopping or stopped, still attempt to stop services
            self._state = RunningState.STOPPING

        # Stop self_asr
        if self.self_asr is not None:
            try:
                self.self_asr.stop()
            except Exception:
                logger.exception("Error stopping self_asr")
            finally:
                self.self_asr = None

        # Stop other_asr
        if self.other_asr is not None:
            try:
                self.other_asr.stop()
            except Exception:
                logger.exception("Error stopping other_asr")
            finally:
                self.other_asr = None

        # Stop audio recorders (now handled externally from ASR services)
        if self.self_audio_recorder is not None:
            try:
                self.self_audio_recorder.stop()
            except Exception:
                logger.exception("Error stopping self_audio_recorder")
            finally:
                self.self_audio_recorder = None

        with self._lock:
            self._state = RunningState.STOPPED

    def get_state(self) -> RunningState:
        # simple getter; protected by lock for consistency
        with self._lock:
            return self._state

    def _process_partial(self, partial: str, speaker: Speaker, partial_attr: str) -> None:
        partial_transcript: Transcript = getattr(self, partial_attr)
        if partial_transcript.text == partial:
            return

        logger.debug(f"{speaker}: {partial}")
        with self._lock:
            if partial_transcript.timestamp == 0:
                partial_transcript.timestamp = DatetimeUtil.get_current_timestamp()
            partial_transcript.text = partial

    def on_self_partial(self, partial: str) -> None:
        # callback from ASRService (synchronous)
        try:
            self._process_partial(partial, Speaker.SELF, "transcript_self_partial")
        except Exception:
            logger.exception("on_self_partial failed")

    def on_other_partial(self, partial: str) -> None:
        try:
            self._process_partial(partial, Speaker.OTHER, "transcript_other_partial")
        except Exception:
            logger.exception("on_other_partial failed")

    def _process_final(self, final: str, speaker: Speaker, partial_attr: str) -> bool:
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

    def on_self_final(self, final: str) -> None:
        try:
            if self._process_final(final, Speaker.SELF, "transcript_self_partial") and self.callback_on_self_final:
                self.callback_on_self_final(self.get_final_transcripts())
        except Exception:
            logger.exception("on_self_final failed")

    def on_other_final(self, final: str) -> None:
        try:
            if self._process_final(final, Speaker.OTHER, "transcript_other_partial") and self.callback_on_other_final:
                self.callback_on_other_final(self.get_final_transcripts())
        except Exception:
            logger.exception("on_other_final failed")

    def get_final_transcripts(self) -> list[Transcript]:
        with self._lock:
            final_transcripts = copy.deepcopy(self.transcripts)

        return self.merge_other_transcripts(final_transcripts)

    def merge_other_transcripts(self, transcripts: list[Transcript]) -> list[Transcript]:
        """
        Merge transcripts but only merge consecutive entries from the OTHER speaker.
        SELF transcripts are kept as separate entries even if consecutive.
        """
        ret: list[Transcript] = []
        transcripts.sort(key=lambda t: t.timestamp)
        for t in transcripts:
            # Only merge if the last entry in ret is from the same speaker
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

        return self.merge_other_transcripts(transcripts=transcripts)

    def clear_transcripts(self) -> None:
        with self._lock:
            self.transcripts = []
            self.transcript_self_partial = Transcript(speaker=Speaker.SELF, text="", timestamp=0)
            self.transcript_other_partial = Transcript(speaker=Speaker.OTHER, text="", timestamp=0)

    def correct_text(self, text: str) -> str:
        """Recover errors on final transcript text. Ensure safe indexing and punctuation."""
        if not text:
            return ""
        s = text.strip()
        if not s:
            return ""
        s = s.rstrip(".")
        s = s[0].upper() + s[1:]
        if not s.endswith("."):
            s = s + "."
        return s

    def correct_text_partial(self, text: str) -> str:
        """Format partial text (do not add final punctuation)."""
        if not text:
            return ""
        s = text.strip()
        if not s:
            return ""
        return s[0].upper() + s[1:]

    def filter_transcript(self, text: str | None) -> str | None:
        if not text:
            return None

        cleaned = text.lower().strip(",.!?").strip()
        if cleaned in [
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
