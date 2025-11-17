from backend.app.services.asr_service import ASRService


def test_asr_service() -> None:
    def on_final(result_json):
        print("Final:", result_json)

    def on_partial(result_json):
        print("Partial:", result_json)

    service = ASRService(
        device=22,
        channels=2,
        on_final=on_final,
        on_partial=on_partial,
    )

    # Run until interrupted
    service.run_forever()
