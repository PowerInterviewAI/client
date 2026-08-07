import {
  LIVE_SUGGESTION_GAP_MS,
  SELF_PARTIAL_STALE_MS,
  TRANSCRIPT_INTER_TRANSCRIPT_GAP_MS,
} from '../consts.js';
import { Speaker, Transcript } from '../types/app-state.js';
import { appStateService } from './app-state.service.js';
import { liveSuggestionService } from './suggestion-live.service.js';

class TranscriptService {
  private isActive = false;

  private selfTranscripts: Transcript[] = [];
  private selfPartialTranscript: Transcript | null = null;
  private otherTranscripts: Transcript[] = [];
  private otherPartialTranscript: Transcript | null = null;

  async ingest(channelRaw: string, typeRaw: string, textRaw: string): Promise<void> {
    if (!this.isActive) return;

    const text = String(textRaw ?? '').trim();
    if (!text) return;

    const speaker = String(channelRaw).toLowerCase() === 'ch_0' ? Speaker.Other : Speaker.Self;
    const isFinal = String(typeRaw).toLowerCase() === 'final';
    const now = Date.now();

    const transcript: Transcript = {
      timestamp: now,
      text,
      isFinal,
      speaker,
      endTimestamp: now,
    };

    if (transcript.speaker === Speaker.Self) {
      if (isFinal) {
        transcript.timestamp = this.selfPartialTranscript?.timestamp ?? transcript.timestamp;
        this.selfTranscripts.push(transcript);
        this.selfPartialTranscript = null;
      } else if (this.selfPartialTranscript) {
        this.selfPartialTranscript.text = transcript.text;
        this.selfPartialTranscript.endTimestamp = transcript.endTimestamp;
      } else {
        this.selfPartialTranscript = transcript;
      }
    } else if (isFinal) {
      transcript.timestamp = this.otherPartialTranscript?.timestamp ?? transcript.timestamp;
      this.otherTranscripts.push(transcript);
      this.otherPartialTranscript = null;
    } else if (this.otherPartialTranscript) {
      this.otherPartialTranscript.text = transcript.text;
      this.otherPartialTranscript.endTimestamp = transcript.endTimestamp;
    } else {
      this.otherPartialTranscript = transcript;
    }

    let allTranscripts = [...this.selfTranscripts, ...this.otherTranscripts];
    if (this.selfPartialTranscript) allTranscripts.push(this.selfPartialTranscript);
    if (this.otherPartialTranscript) allTranscripts.push(this.otherPartialTranscript);
    allTranscripts = allTranscripts.filter(Boolean).sort((a, b) => a.timestamp - b.timestamp);

    const cleaned: Transcript[] = [];
    for (const t of allTranscripts) {
      const lastIndex = cleaned.length - 1;
      if (lastIndex < 0) {
        cleaned.push({ ...t });
        continue;
      }

      const lastCleaned = cleaned[lastIndex];
      if (
        lastCleaned.speaker === t.speaker &&
        t.timestamp - lastCleaned.endTimestamp <= TRANSCRIPT_INTER_TRANSCRIPT_GAP_MS
      ) {
        lastCleaned.text += ' ' + t.text;
        lastCleaned.endTimestamp = t.endTimestamp;
      } else {
        cleaned.push({ ...t });
      }
    }

    const lastSelf = cleaned.filter((t) => t.speaker === Speaker.Self).slice(-1)[0];
    if (transcript.speaker === Speaker.Other && transcript.isFinal) {
      // These two conditions are the only ways a suggestion is silently suppressed, and
      // neither surfaces anywhere. Logged so a field or local repro can distinguish
      // "the request was never made" from "the request was made and stalled".

      // A partial that has gone quiet is almost certainly orphaned by a dropped ASR socket
      // whose final never arrived. Treat it as absent rather than gating indefinitely.
      const blockedByPartial =
        !!this.selfPartialTranscript &&
        now - this.selfPartialTranscript.endTimestamp <= SELF_PARTIAL_STALE_MS;
      const selfAgeMs = lastSelf ? now - lastSelf.endTimestamp : null;
      const skipDueToRecentSelf =
        !!lastSelf && lastSelf.isFinal && selfAgeMs !== null && selfAgeMs <= LIVE_SUGGESTION_GAP_MS;

      console.info(
        `[TranscriptService] suggestion gate: blockedByPartial=${blockedByPartial}` +
          ` skipDueToRecentSelf=${skipDueToRecentSelf}` +
          ` lastSelfAgeMs=${selfAgeMs ?? 'none'}`
      );

      if (!blockedByPartial && !skipDueToRecentSelf) {
        await liveSuggestionService.startGenerateSuggestion(cleaned);
      }
    }

    appStateService.updateState({ transcripts: cleaned });
  }

  /**
   * Promote an in-flight partial to a final when its ASR socket drops.
   *
   * A reconnect opens a brand-new backend session, so the final for the interrupted utterance
   * is never sent. Without this the partial is orphaned: for `ch_1` it gates every live
   * suggestion until the candidate next finishes speaking, and its text is silently overwritten
   * by the next utterance rather than kept.
   */
  handleChannelDisconnected(channelRaw: string): void {
    if (!this.isActive) return;

    const speaker = String(channelRaw).toLowerCase() === 'ch_0' ? Speaker.Other : Speaker.Self;
    const partial =
      speaker === Speaker.Self ? this.selfPartialTranscript : this.otherPartialTranscript;
    if (!partial) return;

    // Keep the original endTimestamp. Stamping it with the current time would make this the
    // "recent self" the suggestion gate measures against, suppressing the next suggestion for
    // LIVE_SUGGESTION_GAP_MS at exactly the moment the user is recovering from a dropped socket.
    partial.isFinal = true;
    if (speaker === Speaker.Self) {
      this.selfTranscripts.push(partial);
      this.selfPartialTranscript = null;
    } else {
      this.otherTranscripts.push(partial);
      this.otherPartialTranscript = null;
    }

    console.info(`[TranscriptService] promoted orphaned ${channelRaw} partial after disconnect`);
  }

  async start(): Promise<void> {
    this.isActive = true;
  }

  async stop(): Promise<void> {
    this.isActive = false;
  }

  clear(): void {
    this.selfTranscripts = [];
    this.selfPartialTranscript = null;
    this.otherTranscripts = [];
    this.otherPartialTranscript = null;
    appStateService.updateState({ transcripts: [] });
  }
}

export const transcriptService = new TranscriptService();
