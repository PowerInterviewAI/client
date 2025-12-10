import os
from datetime import UTC, datetime, timedelta

import tzlocal


class DatetimeUtil:
    @classmethod
    def get_current_timestamp(cls) -> int:
        """
        Returns current timestamp in milliseconds.

        Args:
            None

        Returns:
            int: Current timestamp in milliseconds
        """
        return int(datetime.now(tz=UTC).timestamp() * 1000)

    @classmethod
    def get_datetime_from_timestamp(cls, timestamp: int) -> datetime:
        """
        Returns datetime from timestamp in milliseconds.

        Args:
            timestamp (int): Timestamp in milliseconds

        Returns:
            datetime: Datetime from timestamp
        """
        return datetime.fromtimestamp(timestamp / 1000, tz=UTC)

    @classmethod
    def format_timestamp_local(cls, timestamp: int) -> str:
        ts = timestamp / 1000 if timestamp > 1e12 else timestamp  # noqa: PLR2004

        # Localize timestamp
        local_tz = tzlocal.get_localzone()
        local_time = datetime.fromtimestamp(ts, tz=local_tz)
        # Platform-specific hour formatting
        fmt = "%m/%d/%Y %-I:%M %p %Z"
        if os.name == "nt":  # For Windows compatibility
            fmt = "%m/%d/%Y %#I:%M %p %Z"

        return local_time.strftime(fmt)

    @classmethod
    def get_timestamp_from_datetime(cls, dt: datetime) -> int:
        """
        Returns timestamp from datetime in milliseconds.

        Args:
            dt (datetime): Datetime

        Returns:
            int: Timestamp in milliseconds
        """
        return int(dt.timestamp() * 1000)

    @classmethod
    def get_prev_month_last_day(cls) -> datetime:
        """
        Returns last day of previous month.

        Args:
            None

        Returns:
            datetime: Last day of previous month
        """
        now = datetime.now(tz=UTC)
        return now.replace(day=1) - timedelta(days=1)

    @classmethod
    def get_prev_month_end_timestamp(cls) -> int:
        """
        Returns timestamp of 23:59:59 last day of previous month.

        Args:
            None

        Returns:
            int: Timestamp of last day of previous month
        """
        prev_month_last_day = cls.get_prev_month_last_day()
        # Set time to 23:59:59
        prev_month_last_day = prev_month_last_day.replace(hour=23, minute=59, second=59, microsecond=0)
        return cls.get_timestamp_from_datetime(prev_month_last_day)

    @classmethod
    def get_prev_month_start_day(cls) -> datetime:
        """
        Returns first day of previous month.

        Args:
            None

        Returns:
            datetime: First day of previous month
        """
        prev_month_last_day = cls.get_prev_month_last_day()
        return prev_month_last_day.replace(day=1)

    @classmethod
    def get_prev_month_start_timestamp(cls) -> int:
        """
        Returns timestamp of 00:00:00 first day of previous month.

        Args:
            None

        Returns:
            int: Timestamp of first day of previous month
        """
        prev_month_start_day = cls.get_prev_month_start_day()
        # Set time to 00:00:00
        prev_month_start_day = prev_month_start_day.replace(hour=0, minute=0, second=0, microsecond=0)
        return cls.get_timestamp_from_datetime(prev_month_start_day)

    @classmethod
    def get_this_month_start_timestamp(cls) -> int:
        """
        Returns timestamp of 00:00:00 first day of this month.

        Args:
            None

        Returns:
            int: Timestamp of first day of this month
        """
        this_month_start_day = datetime.now(tz=UTC).replace(day=1)
        # Set time to 00:00:00
        this_month_start_day = this_month_start_day.replace(hour=0, minute=0, second=0, microsecond=0)
        return cls.get_timestamp_from_datetime(this_month_start_day)
