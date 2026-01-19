from typing import Any

import requests
from requests import Response

from engine.cfg.auth import config as cfg_auth
from engine.cfg.client import config as cfg_client
from engine.services.config_service import ConfigService
from engine.services.device_service import DeviceService


class WebClient:
    @classmethod
    def _get_headers(cls) -> dict[str, str]:
        device_info = DeviceService.get_device_info()
        user_agent = f"PowerInterview ({device_info.os_name} {device_info.arch}; {device_info.device_id})"
        return {"User-Agent": user_agent}

    @classmethod
    def get(cls, url: str) -> Response:
        session_token = ConfigService.config.session_token
        cookies = {cfg_auth.SESSION_TOKEN_COOKIE_NAME: session_token} if session_token else {}
        return requests.get(
            url,
            cookies=cookies,
            headers=cls._get_headers(),
            timeout=cfg_client.HTTP_TIMEOUT_SECS,
        )

    @classmethod
    def post(cls, url: str, json: Any, stream: bool = False) -> Response:  # noqa: ANN401, FBT001, FBT002
        session_token = ConfigService.config.session_token
        cookies = {cfg_auth.SESSION_TOKEN_COOKIE_NAME: session_token} if session_token else {}
        return requests.post(
            url,
            json=json,
            cookies=cookies,
            headers=cls._get_headers(),
            timeout=cfg_client.HTTP_TIMEOUT_SECS,
            stream=stream,
        )

    @classmethod
    def post_file(cls, url: str, files: Any) -> Response:  # uploads multipart/form-data files  # noqa: ANN401
        """
        Uploads multipart/form-data files to the specified URL.

        Args:
            url (str): The URL to which the files will be uploaded.
            files (Any): The files to be uploaded in multipart/form-data format.

        Returns:
            Response: The response from the server.
        """
        session_token = ConfigService.config.session_token
        cookies = {cfg_auth.SESSION_TOKEN_COOKIE_NAME: session_token} if session_token else {}
        return requests.post(
            url,
            files=files,
            cookies=cookies,
            headers=cls._get_headers(),
            timeout=cfg_client.HTTP_TIMEOUT_SECS,
        )
