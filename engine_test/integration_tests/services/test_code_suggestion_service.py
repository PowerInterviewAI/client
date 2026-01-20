import io
import time

from loguru import logger
from PIL import ImageGrab

from engine.services.code_suggestion_service import CodeSuggestionService


def test_code_suggestion_service() -> None:
    service = CodeSuggestionService()

    # Capture screen
    img = ImageGrab.grab(all_screens=True)
    img_gray = img.convert("L")  # 8-bit grayscale

    img_bytes = io.BytesIO()
    img_gray.save(img_bytes, format="PNG")

    # Add screenshot to pending prompt
    service.add_image(image_bytes=img_bytes.getvalue())

    # Generate code suggeston
    service.generate_code_suggestion_async()

    # Wait for generation complete
    time.sleep(10)

    # Show result
    suggestions = service.get_suggestions()
    for suggestion in suggestions:
        logger.debug(f"Suggestion: {suggestion.model_dump_json(indent=2)}")
