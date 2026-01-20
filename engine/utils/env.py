import os
import sys


class EnvUtil:
    @classmethod
    def is_test(cls) -> bool:
        """Return True when running under a test runner (pytest/unittest/nose).

        Detection heuristics:
        - `PYTEST_CURRENT_TEST` or `PYTEST_RUNNING` env var set by pytest
        - `pytest` present in `sys.modules`
        - common test runner names present in `sys.argv[0]`
        """
        # Environment variables set by pytest
        if os.environ.get("PYTEST_CURRENT_TEST"):
            return True
        if os.environ.get("PYTEST_RUNNING"):
            return True

        # If pytest was imported
        if "pytest" in sys.modules:
            return True

        # Check process/argv name for common test runners
        argv0 = sys.argv[0] if sys.argv else ""
        runner_indicators = ("pytest", "py.test", "unittest", "nosetests", "nose")
        return any(token in argv0 for token in runner_indicators)
