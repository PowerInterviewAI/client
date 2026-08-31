import { useEffect, useRef } from 'react';

import { mockTranscriptionService } from '@/services/mock-transcription.service';
import { mockTtsService } from '@/services/mock-tts.service';
import { DEFAULT_LANGUAGE } from '@/types/language';
import { type MockInterviewSetup, MockInterviewState } from '@/types/mock-interview';

import { useAppState } from './use-app-state';
import { useConfigStore } from './use-config-store';

/**
 * Drives the renderer's audio services off the mock interview's broadcast state, and exposes the
 * commands the UI issues.
 *
 * Main owns the state machine; this hook's job is entirely reactive plus a few imperative
 * entry points that need to happen in a specific order relative to an IPC call:
 *
 * - Microphone capture starts explicitly in `startSession`, *before* asking main to generate the
 *   first question, so a denied permission is a cheap failure caught before any backend call
 *   rather than a mismatch between "main thinks Speaking" and "renderer has no microphone".
 * - Playback starts when the broadcast state becomes `Speaking`.
 * - `mockTtsService.stop()` runs on every transition where the new state is not `Speaking` - a
 *   no-op if nothing was playing, and what stops a stray Speaking-driven playback dead the moment
 *   Skip or End interview moves main on to something else. It does not touch a `Repeat` the user
 *   triggers while genuinely `Listening`, because that never changes `session.state` and so never
 *   re-runs this effect.
 * - Capture stops when the session reaches `Idle` or `Finished`.
 */
export function useMockInterview() {
  const { appState } = useAppState();
  const session = appState?.mockInterview ?? null;
  const { config } = useConfigStore();

  const prevStateRef = useRef<MockInterviewState | null>(null);
  const captureRunningRef = useRef(false);

  useEffect(() => {
    const state = session?.state ?? null;
    if (state === prevStateRef.current) return;
    const previous = prevStateRef.current;
    prevStateRef.current = state;

    if (state !== MockInterviewState.Speaking) {
      mockTtsService.stop();
    }

    if (state === MockInterviewState.Speaking && session?.currentQuestion) {
      if (previous !== MockInterviewState.Speaking && !session.currentQuestion.isFollowUp) {
        mockTtsService.resetCache();
      }
      void mockTtsService.playQuestion(session.currentQuestion.chunks);
    }

    if (
      captureRunningRef.current &&
      (state === MockInterviewState.Idle || state === MockInterviewState.Finished)
    ) {
      captureRunningRef.current = false;
      void mockTranscriptionService.stop();
    }
  }, [session?.state, session?.currentQuestion]);

  // Belt for a component unmounting mid-session (navigating away without going through
  // endSession first) - stops local audio so a stray track is not left open. Main's own state
  // is tidied up by the caller of endSession, not by this cleanup.
  useEffect(() => {
    return () => {
      if (captureRunningRef.current) {
        captureRunningRef.current = false;
        void mockTranscriptionService.stop();
      }
      mockTtsService.stop();
    };
  }, []);

  /**
   * Acquire the microphone, then ask main to generate the first question.
   * Throws if the microphone cannot be acquired, before any backend call is made.
   */
  const startSession = async (setup: MockInterviewSetup): Promise<void> => {
    const electron = window.electronAPI;
    if (!electron) throw new Error('Electron API not available');

    await mockTranscriptionService.start(
      config?.audioInputDeviceName ?? '',
      config?.sessionToken ?? '',
      config?.language ?? DEFAULT_LANGUAGE
    );
    captureRunningRef.current = true;
    mockTtsService.setMicTrack(mockTranscriptionService.getStream()?.getAudioTracks()[0] ?? null);

    try {
      await electron.mockInterview.start(setup);
    } catch (error) {
      captureRunningRef.current = false;
      await mockTranscriptionService.stop();
      throw error;
    }
  };

  const endSession = async (): Promise<void> => {
    await window.electronAPI?.mockInterview.endSession();
  };

  const skipQuestion = async (): Promise<void> => {
    await window.electronAPI?.mockInterview.skipQuestion();
  };

  const answerFinished = async (): Promise<void> => {
    await window.electronAPI?.mockInterview.answerFinished();
  };

  const repeatQuestion = async (): Promise<void> => {
    if (!session?.currentQuestion?.chunks.length) return;
    await mockTtsService.repeat(session.currentQuestion.chunks);
  };

  const clear = async (): Promise<void> => {
    await window.electronAPI?.mockInterview.clear();
  };

  return { session, startSession, endSession, skipQuestion, answerFinished, repeatQuestion, clear };
}
