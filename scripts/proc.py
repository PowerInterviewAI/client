import subprocess


def run(command: str, cwd: str | None = None) -> None:
    """
    Run a shell command and stream output live.
    Raises an error if the command fails.
    """
    print(f"\n>>> Running: {command}")  # noqa: T201
    result = subprocess.run(  # noqa: S602
        command,
        check=False,
        cwd=cwd,
        shell=True,
        text=True,
    )
    if result.returncode != 0:
        msg = f"Command failed: {command}"
        raise RuntimeError(msg)
