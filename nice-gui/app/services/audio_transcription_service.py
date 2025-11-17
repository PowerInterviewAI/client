import queue
import threading
import time

import numpy as np
import sounddevice as sd
from loguru import logger
from vosk import KaldiRecognizer, Model

from app.cfg.fs import config as cfg_fs

# -------------------------
# Configuration
# -------------------------
SAMPLE_RATE = 48000
# MODEL_PATH = cfg_fs.MODELS_DIR / "vosk-model-small-en-us-0.15"
MODEL_PATH = cfg_fs.MODELS_DIR / "vosk-model-en-us-0.42-gigaspeech"
logger.debug(MODEL_PATH)

# -------------------------
# Global setup
# -------------------------
audio_queue = queue.Queue()

logger.info("Loading Vosk model...")
model = Model(str(MODEL_PATH))
recognizer = KaldiRecognizer(model, SAMPLE_RATE)
recognizer.SetWords(True)


# -------------------------
# Audio Callback
# -------------------------
def audio_callback(indata, frames, time_info, status):
    """Push raw PCM float audio frames to queue."""
    if status:
        logger.warning(f"Audio status: {status}")

    # mono = indata[:, 0] if indata.ndim > 1 else indata
    mono = indata.mean(axis=1) if indata.ndim > 1 else indata
    audio_queue.put(mono.copy())


# -------------------------
# ASR Worker Thread
# -------------------------
def asr_worker():
    """Continuously feed recognizer with PCM16 frames."""
    while True:
        data = audio_queue.get()
        if data is None:
            break

        # Convert float32 [-1,1] → int16 PCM
        pcm16 = (data * 32767).astype(np.int16).tobytes()

        # Streaming recognizer
        if recognizer.AcceptWaveform(pcm16):
            # Final phrase recognized
            result = recognizer.Result()
            logger.info(f"[FINAL] {result}")
        else:
            # Partial result (real-time updates)
            partial = recognizer.PartialResult()
            logger.debug(f"[PARTIAL] {partial}")


# -------------------------
# Main entry
# -------------------------
def main():
    # Start worker
    thread = threading.Thread(target=asr_worker, daemon=True)
    thread.start()

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=2,
        dtype="float32",
        blocksize=int(SAMPLE_RATE * 0.25),  # 0.25 s blocks
        callback=audio_callback,
        device=22,
    ):
        logger.info("Listening with Vosk... Ctrl+C to stop.")

        try:
            while True:
                time.sleep(0.1)
        except KeyboardInterrupt:
            logger.info("Stopping...")
            audio_queue.put(None)
            thread.join()


if __name__ == "__main__":
    main()
