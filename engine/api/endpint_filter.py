import logging


class EndpointFilter(logging.Filter):
    def __init__(self, excluded_paths: list[str]) -> None:
        super().__init__()
        self.excluded_paths = excluded_paths

    def filter(self, record: logging.LogRecord) -> bool:
        # record.args[0] contains the request line (e.g. "GET /suggestions-stream HTTP/1.1")
        msg = record.getMessage()
        return not any(path in msg for path in self.excluded_paths)
