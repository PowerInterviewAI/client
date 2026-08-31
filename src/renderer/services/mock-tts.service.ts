import { MOCK_TTS_GATE_MAX_HOLD_MS, MOCK_TTS_TAIL_MS } from '@/lib/consts';
import { getElectron } from '@/lib/utils';

/**
 * Mutes the candidate's microphone track while the interviewer's TTS audio is playing.
 *
 * This is the mechanism that keeps the interviewer's own voice out of the candidate's answer
 * transcript - closing the loopback-capture route (see `mock-transcription.service.ts`) leaves
 * exactly this one acoustic path in: the TTS voice comes out of the speakers, the microphone is
 * open, and without a gate the ASR would transcribe the question as something the candidate said.
 *
 * A stranded mute must be impossible, so this holds four independent layers:
 *   1. The caller wraps every play attempt in a `finally` that releases the gate - a rejected
 *      `play()`, a decode error, an abort, and a normal `ended` all reach it.
 *   2. A watchdog armed at `acquire()` force-releases past `MOCK_TTS_GATE_MAX_HOLD_MS`, covering
 *      the one case a `finally` cannot: an `HTMLAudioElement` that never fires `ended` or `error`.
 *      Precedent: `ACTION_LOCK_MAX_HOLD_MS` in `consts.ts`.
 *   3. `release()` takes the token `acquire()` returned, not a boolean, so a late release from a
 *      superseded acquisition cannot reopen the mic out from under a newer one.
 *   4. `forceReleaseNow()` is the state-driven belt `use-mock-interview.ts` calls whenever the
 *      broadcast state moves off `Speaking` for a reason other than normal playback completion.
 */
class MicGate {
  private track: MediaStreamTrack | null = null;
  private seq = 0;
  private tailTimer: number | null = null;
  private watchdogTimer: number | null = null;

  setTrack(track: MediaStreamTrack | null): void {
    this.track = track;
  }

  /** Mutes the track and returns the token this acquisition must present to `release()`. */
  acquire(): number {
    this.clearTimers();
    this.seq += 1;
    const mySeq = this.seq;
    if (this.track) this.track.enabled = false;
    this.watchdogTimer = window.setTimeout(() => {
      console.warn('[MicGate] watchdog fired - forcing the microphone back open');
      this.release(mySeq);
    }, MOCK_TTS_GATE_MAX_HOLD_MS);
    return mySeq;
  }

  /**
   * Release after `MOCK_TTS_TAIL_MS`, covering room reverb and Deepgram's own lookahead.
   * A token from a superseded acquisition is ignored - `forceReleaseNow` already handled it.
   */
  release(mySeq: number): void {
    if (mySeq !== this.seq) return;
    if (this.watchdogTimer !== null) {
      window.clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.tailTimer !== null) return;
    this.tailTimer = window.setTimeout(() => {
      this.tailTimer = null;
      if (this.track) this.track.enabled = true;
    }, MOCK_TTS_TAIL_MS);
  }

  /** Opens the mic immediately, regardless of token, and invalidates any acquisition in flight. */
  forceReleaseNow(): void {
    this.seq += 1;
    this.clearTimers();
    if (this.track) this.track.enabled = true;
  }

  private clearTimers(): void {
    if (this.watchdogTimer !== null) {
      window.clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.tailTimer !== null) {
      window.clearTimeout(this.tailTimer);
      this.tailTimer = null;
    }
  }
}

/**
 * Fetches and plays a mock-interview question's audio, one sentence chunk at a time.
 *
 * Main does the sentence splitting and the network call (see `speech-chunks.ts` and
 * `mockInterviewService.synthesizeChunk`); this only drives playback and requests chunk *n+1*
 * while chunk *n* plays, so time-to-first-audio is the first sentence rather than the whole
 * question. Chunks are cached per question so `Repeat question` costs no re-synthesis.
 */
class MockTtsService {
  private gate = new MicGate();
  private audio: HTMLAudioElement | null = null;
  private cache = new Map<number, Blob>();
  private playSeq = 0;

  setMicTrack(track: MediaStreamTrack | null): void {
    this.gate.setTrack(track);
  }

  /** Called whenever the question changes, so a long session does not accumulate every chunk. */
  resetCache(): void {
    this.cache.clear();
  }

  /** Plays every chunk in order, gating the mic for the duration, then reports the outcome. */
  async playQuestion(chunks: string[]): Promise<void> {
    const seq = ++this.playSeq;
    const electron = getElectron();
    if (!electron) return;

    const mySeq = this.gate.acquire();
    try {
      for (let i = 0; i < chunks.length; i++) {
        if (seq !== this.playSeq) return; // superseded - skip/end-interview/next question
        const blob = await this.getChunkBlob(i, chunks.length);
        if (seq !== this.playSeq) return;
        if (!blob) throw new Error('Synthesis returned no audio');
        await this.playBlob(blob);
      }
      if (seq !== this.playSeq) return;
      await electron.mockInterview.speechFinished();
    } catch (error) {
      console.error('[MockTtsService] playback failed, falling back to text-only:', error);
      if (seq === this.playSeq) {
        await electron.mockInterview.speechFailed().catch(() => {});
      }
    } finally {
      // Unconditional, and the reason this is a `finally`: whatever happened above - a clean
      // finish, a synthesis failure, a decode error, a superseding stop() - the mic must reopen.
      this.gate.release(mySeq);
    }
  }

  /** Replays the current question from cache. No re-synthesis, no second Deepgram charge. */
  async repeat(chunks: string[]): Promise<void> {
    await this.playQuestion(chunks);
  }

  /**
   * Aborts in-flight playback and forces the mic open. Used on Skip, End interview, and the
   * state-driven belt in `use-mock-interview.ts`.
   */
  stop(): void {
    this.playSeq += 1;
    if (this.audio) {
      try {
        this.audio.pause();
      } catch {
        // noop - the element is being discarded either way
      }
      this.audio = null;
    }
    this.gate.forceReleaseNow();
  }

  private async getChunkBlob(index: number, total: number): Promise<Blob | null> {
    const cached = this.cache.get(index);
    if (cached) return cached;

    const blob = await this.fetchChunk(index);
    if (blob) this.cache.set(index, blob);

    // Lookahead of one: kick off the next chunk's synthesis without waiting for it, so it is
    // likely ready by the time the current chunk finishes playing.
    if (index + 1 < total && !this.cache.has(index + 1)) {
      void this.fetchChunk(index + 1).then((next) => {
        if (next) this.cache.set(index + 1, next);
      });
    }

    return blob;
  }

  private async fetchChunk(index: number): Promise<Blob | null> {
    const electron = getElectron();
    if (!electron) return null;
    try {
      const buffer = await electron.mockInterview.synthesizeChunk(index);
      return buffer ? new Blob([buffer], { type: 'audio/mpeg' }) : null;
    } catch (error) {
      console.warn(`[MockTtsService] failed to synthesize chunk ${index}:`, error);
      return null;
    }
  }

  private playBlob(blob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.audio = audio;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        if (this.audio === audio) this.audio = null;
      };

      audio.onended = () => {
        cleanup();
        resolve();
      };
      audio.onerror = () => {
        cleanup();
        reject(new Error('Audio playback error'));
      };
      audio.play().catch((error: unknown) => {
        cleanup();
        reject(error instanceof Error ? error : new Error('Audio play() rejected'));
      });
    });
  }
}

export const mockTtsService = new MockTtsService();
