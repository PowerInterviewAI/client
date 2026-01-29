import io
import threading
import time
from http import HTTPStatus
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
from engine.schemas.ping_client import PingClientRequest
from engine.schemas.summarize import GenerateSummarizeRequest
from engine.schemas.transcript import Speaker, Transcript
from engine.services.audio_control_service import AudioControlService
from engine.services.audio_device_service import AudioDeviceService
from engine.services.code_suggestion_service import CodeSuggestionService
from engine.services.config_service import ConfigService
from engine.services.device_service import DeviceService
from engine.services.reply_suggestion_service import ReplySuggestionService
from engine.services.service_monitor import ServiceMonitor
from engine.services.transcript_service import Transcriber
from engine.services.virtual_camera import VirtualCameraService
from engine.services.web_client import WebClient
from engine.utils.datetime import DatetimeUtil


class PowerInterviewApp:
    def __init__(self) -> None:
        self.service_monitor = ServiceMonitor(app=self)

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

    # ---- Authentication ----
    def init_app(self) -> None:
        """
        Initialize the application by attempting to authenticate with the backend.

        This method performs the following steps:
        1. Checks if a session token exists in the configuration
        2. If a token exists, validates it with the backend by sending a ping request
        3. If the token is invalid (401 Unauthorized), clears it and marks user as logged out
        4. If validation succeeds, marks the user as logged in
        5. Updates the service monitor with the authentication status
        6. Starts all background monitoring tasks (backend health, GPU server, etc.)

        The method uses a retry loop with exponential backoff (1 second delay) for
        session token validation to handle temporary network issues. If no session
        token exists, the user will need to log in through the UI.
        """
        # Attempt to authenticate using an existing session token if available
        is_logged_in = False
        if ConfigService.config.session_token:
            # Retry loop to handle transient network failures
            while True:
                try:
                    logger.info("Existing session token found, attempting to authenticate")

                    # Gather device information for the authentication request
                    device_info = DeviceService.get_device_info()

                    # Create a ping request to validate the session token with the backend
                    ping_request = PingClientRequest(
                        device_info=device_info,
                        is_gpu_alive=False,
                        is_assistant_running=False,
                    )

                    # Send the ping request to the backend to validate the token
                    resp = WebClient.post(
                        cfg_client.BACKEND_PING_CLIENT_URL,
                        json=ping_request.model_dump(mode="json"),
                    )

                    # Check if the session token has expired or been revoked (401 Unauthorized)
                    if resp.status_code == HTTPStatus.UNAUTHORIZED:
                        logger.warning("Existing session token is invalid, need to login again")
                        # Clear the invalid token so the user can log in with credentials again
                        ConfigService.update_config(ConfigUpdate(session_token=""))
                        is_logged_in = False
                        break

                    # Raise an exception for any other HTTP error status codes
                    raise_for_status(resp)

                    # If we reach here, authentication was successful
                    is_logged_in = True
                    logger.info("Successfully authenticated using existing session token")
                    break

                except Exception as ex:
                    # Log the error and retry after a short delay
                    logger.error(f"Failed to authenticate using existing session token: {ex}")
                    time.sleep(1)
        else:
            # No session token found in configuration; user must log in through the UI
            logger.info("No existing session token found, user needs to login")

        # Update the service monitor with the authentication status
        # This allows the UI and other services to respond to the login state
        self.service_monitor.set_logged_in(is_logged_in)

        # ---- Background Tasks ----
        # Start all background monitoring tasks to keep the application healthy
        logger.info("Starting background service monitors")

        # Monitor the backend API server for availability
        self.service_monitor.start_backend_monitor()

        # Monitor the GPU processing server for availability
        self.service_monitor.start_gpu_server_monitor()

        # Periodically wake up the GPU server to prevent it from going to sleep
        self.service_monitor.start_wakeup_gpu_server_loop()

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
    def on_transcriber_self_final(self, transcripts: list[Transcript]) -> None:
        pass

    def on_transcriber_other_final(self, transcripts: list[Transcript]) -> None:
        self.suggestion_service.generate_suggestion_async(
            transcripts,
            ConfigService.config.interview_conf,
        )

    def on_virtual_camera_frame(self, frame_bgr: np.ndarray[Any, Any]) -> None:
        self.virtual_camera_service.set_frame(frame_bgr)

    # --------------------------
    # Global hotkey helpers
    # --------------------------
    def register_global_hotkeys(self) -> None:
        """Attempt to register global hotkeys using the `keyboard` module if available."""

        def _safe_hotkey(handler_callable):  # type:ignore  # noqa: ANN001, ANN202, PGH003
            def _wrapped() -> None:
                try:
                    handler_callable()
                except Exception as ex:
                    logger.warning(f"Hotkey handler error: {ex}")

            return _wrapped

        # Map hotkeys to handlers (wrapped safely so exceptions don't escape)
        keyboard.add_hotkey("ctrl+alt+shift+s", _safe_hotkey(self._on_hotkey_code_suggestion_capture_screenshot))  # type: ignore  # noqa: PGH003
        keyboard.add_hotkey("ctrl+alt+shift+x", _safe_hotkey(self._on_hotkey_code_suggestion_clear_images))  # type: ignore  # noqa: PGH003
        keyboard.add_hotkey("ctrl+alt+shift+enter", _safe_hotkey(self._on_hotkey_code_suggestion_submit))  # type: ignore  # noqa: PGH003

        self._hotkeys_registered = True
        logger.debug("Global hotkeys registered: Ctrl+Alt+Shift+S/C/Enter")

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

    def _on_hotkey_code_suggestion_clear_images(self) -> None:
        """Clear the pending images buffer for code suggestion."""
        self.code_suggestion_service.clear_images()

    def _on_hotkey_code_suggestion_submit(self) -> None:
        """Submit the code suggestion request using the pending prompt and images."""
        self.code_suggestion_service.generate_code_suggestion_async(
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
