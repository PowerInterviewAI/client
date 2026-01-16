import io
import threading
from typing import Any

import keyboard
import numpy as np
from loguru import logger
from PIL import ImageGrab

from engine.api.error_handler import raise_for_status
from engine.cfg.client import config as cfg_client
from engine.cfg.video import config as cfg_video
from engine.models.config import ConfigUpdate
from engine.schemas.app_state import AppState
from engine.schemas.summarize import GenerateSummarizeRequest
from engine.schemas.transcript import Speaker, Transcript
from engine.services.audio_control_service import AudioControlService
from engine.services.audio_device_service import AudioDeviceService
from engine.services.code_suggestion_service import CodeSuggestionService
from engine.services.config_service import ConfigService
from engine.services.reply_suggestion_service import ReplySuggestionService
from engine.services.service_monitor import ServiceMonitor
from engine.services.transcript_service import Transcriber
from engine.services.virtual_camera import VirtualCameraService
from engine.services.web_client import WebClient
from engine.utils.datetime import DatetimeUtil


class PowerInterviewApp:
    def __init__(self) -> None:
        self.service_monitor = ServiceMonitor(app=self, on_logged_out=self.on_logged_out)

        self.transcriber = Transcriber(
            callback_on_self_final=self.on_transcriber_self_final,
            callback_on_other_final=self.on_transcriber_other_final,
        )
        self.suggestion_service = ReplySuggestionService()
        self.code_suggestion_service = CodeSuggestionService()
        self.audio_controller = AudioControlService()
        self.virtual_camera_service = VirtualCameraService(
            width=cfg_video.DEFAULT_WIDTH,
            height=cfg_video.DEFAULT_HEIGHT,
            fps=cfg_video.DEFAULT_FPS,
        )

        # Pending buffers used by global hotkey handlers for code suggestions
        self._pending_code_prompt: str | None = None
        self._pending_code_images: list[bytes] = []
        self._pending_lock = threading.Lock()
        self._hotkeys_registered = False
        self._hotkeys_module = None

    # ---- Configuration Management ----
    # Config management is handled by ConfigService classmethods

    # ---- Assistant Control ----
    def start_assistant(self) -> None:
        self.transcriber.clear_transcripts()
        self.transcriber.start(
            session_token=ConfigService.config.session_token if ConfigService.config.session_token else None,
        )

        self.suggestion_service.clear_suggestions()
        self.code_suggestion_service.clear_suggestions()

        if ConfigService.config.enable_video_control:
            self.virtual_camera_service.update_parameters(
                width=ConfigService.config.video_width,
                height=ConfigService.config.video_height,
                fps=cfg_video.DEFAULT_FPS,
            )
            self.virtual_camera_service.start()
            self.audio_controller.update_parameters(
                input_device_id=AudioDeviceService.get_device_index_by_name(
                    ConfigService.config.audio_input_device_name
                ),
                output_device_id=AudioDeviceService.get_vb_input_device_index(),
                delay_secs=ConfigService.config.audio_delay_ms / 1000,
            )
            self.audio_controller.start()

        # Register global hotkeys
        try:
            self.register_global_hotkeys()
        except Exception as ex:
            logger.error(f"Failed to register global hotkeys: {ex}")

    def stop_assistant(self) -> None:
        self.transcriber.stop()
        self.suggestion_service.stop_current_task()
        self.code_suggestion_service.stop_current_task()
        self.audio_controller.stop()

        # Unregister global hotkeys when stopping assistant
        try:
            self.unregister_global_hotkeys()
        except Exception as ex:
            logger.error(f"Failed to unregister global hotkeys: {ex}")

    # ---- State Management ----
    def get_app_state(self) -> AppState:
        return AppState(
            is_logged_in=self.service_monitor.is_logged_in(),
            assistant_state=self.transcriber.get_state(),
            transcripts=self.transcriber.get_transcripts(),
            suggestions=self.suggestion_service.get_suggestions(),
            code_suggestions=self.code_suggestion_service.get_suggestions(),
            is_backend_live=self.service_monitor.is_backend_live(),
            is_gpu_server_live=self.service_monitor.is_gpu_server_live(),
        )

    # ---- Callbacks ----
    def on_logged_out(self) -> None:
        # Stop the assistant when logout is detected
        self.stop_assistant()

        # Clear session token in app config when logout is detected
        ConfigService.update_config(
            ConfigUpdate(
                session_token="",
            )
        )

    def on_transcriber_self_final(self, transcripts: list[Transcript]) -> None:
        pass

    def on_transcriber_other_final(self, transcripts: list[Transcript]) -> None:
        self.suggestion_service.generate_suggestion_async(
            transcripts,
            ConfigService.config.interview_conf,
        )

    def on_virtual_camera_frame(self, frame_bgr: np.ndarray[Any, Any]) -> None:
        self.virtual_camera_service.set_frame(frame_bgr)

    # ---- Background Tasks ----
    def start_background_tasks(self) -> None:
        self.service_monitor.start_backend_monitor()
        self.service_monitor.start_auth_monitor()
        self.service_monitor.start_gpu_server_monitor()
        self.service_monitor.start_wakeup_gpu_server_loop()

    # --------------------------
    # Global hotkey helpers
    # --------------------------
    def register_global_hotkeys(self) -> None:
        """Attempt to register global hotkeys using the `keyboard` module if available."""

        # Map hotkeys to handlers
        keyboard.add_hotkey("ctrl+alt+shift+s", lambda: self._on_hotkey_code_suggestion_capture_screenshot())
        keyboard.add_hotkey("ctrl+alt+shift+enter", lambda: self._on_hotkey_code_suggestion_submit())

        self._hotkeys_registered = True
        logger.debug("Global hotkeys registered: Ctrl+Alt+Shift+S/P/Enter")

    def unregister_global_hotkeys(self) -> None:
        if not self._hotkeys_registered:
            return
        try:
            keyboard.clear_all_hotkeys()
        except Exception:
            try:
                # older keyboard versions
                keyboard.unhook_all()
            except Exception as ex:
                logger.error(f"Failed to unregister global hotkeys: {ex}")
        self._hotkeys_registered = False
        logger.debug("Global hotkeys unregistered")

    def _on_hotkey_code_suggestion_capture_screenshot(self) -> None:
        """Capture a screenshot and append it to the pending images buffer."""
        # Capture screenshot and convert to 8-bit grayscale PNG
        img = ImageGrab.grab(all_screens=True)
        img_gray = img.convert("L")  # 8-bit grayscale

        img_bytes = io.BytesIO()
        img_gray.save(img_bytes, format="PNG")

        # Append to pending images (full image bytes and grayscale thumbnail)
        self.code_suggestion_service.add_image(image_bytes=img_bytes.getvalue())

    def _on_hotkey_code_suggestion_submit(self) -> None:
        """Submit the code suggestion request using the pending prompt and images."""
        self.code_suggestion_service.generate_code_suggestion(
            transcripts=self.transcriber.get_transcripts(),
        )

    # ---- Service methods ----
    def export_transcript(self) -> str:
        transcripts: list[Transcript] = self.transcriber.get_transcripts()

        # ---- Build Summarize Content ----
        summary_part = ""
        try:
            resp = WebClient.post(
                cfg_client.BACKEND_SUMMARIZE_URL,
                json=GenerateSummarizeRequest(
                    username=ConfigService.config.interview_conf.username,
                    transcripts=transcripts,
                ).model_dump(),
            )
            raise_for_status(resp)
            summary_part = resp.text
        except Exception as ex:
            logger.error(f"Failed to generate summary: {ex}")

        # Add Date/Time to summary
        lines: list[str] = []
        if summary_part:
            lines = summary_part.split("\n")
            if lines:
                tstamp_now = DatetimeUtil.get_current_timestamp()
                datetime_now = DatetimeUtil.format_timestamp_local(tstamp_now)
                lines.insert(1, f"\n**Date/Time:** {datetime_now}")
                summary_part = "\n".join(lines)

        # ---- Build Transcrips Content ----
        lines = []
        for t in transcripts:
            time_str = DatetimeUtil.format_timestamp_local(t.timestamp)
            speaker_name = ConfigService.config.interview_conf.username if t.speaker is Speaker.SELF else "Interviewer"
            lines.append(f"#### {speaker_name} | {time_str}\n{t.text}\n")

        transcripts_part = "## Transcripts\n\n" + "\n".join(lines)

        # ---- Build Suggestions Content ----
        lines = []
        suggestions = self.suggestion_service.get_suggestions()
        for s in suggestions:
            time_str = DatetimeUtil.format_timestamp_local(s.timestamp)
            lines.append(f"#### Interviewer | {time_str}\n{s.last_question}\n\n##### Suggestion\n{s.answer}\n")

        suggestions_part = "## Suggestions\n\n" + "\n".join(lines)

        return f"{summary_part}\n\n{transcripts_part}\n\n{suggestions_part}".strip()


the_app = PowerInterviewApp()
