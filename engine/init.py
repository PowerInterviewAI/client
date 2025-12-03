from engine.app import the_app


async def init_app() -> None:
    the_app.load_config()
    await the_app.start_background_tasks()
