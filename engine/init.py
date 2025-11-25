from engine.app import the_app


def init_app() -> None:
    the_app.start_background_tasks()
