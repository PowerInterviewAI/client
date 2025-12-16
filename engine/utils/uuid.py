import uuid

import uuid_extensions
from loguru import logger


class UuidUtil:
    @classmethod
    def get_zero(cls) -> uuid.UUID:
        """Returns UUID of zero"""
        return uuid.UUID("00000000-0000-0000-0000-000000000000")

    @classmethod
    def make_uuid(cls) -> uuid.UUID:
        """Creates new UUID"""
        return uuid_extensions.uuid7()  # type: ignore  # noqa: PGH003


if __name__ == "__main__":
    logger.debug(f"uuid: {UuidUtil.make_uuid()}")
