import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMicLevel } from '@/hooks/use-mic-level';
import { mockTranscriptionService } from '@/services/mock-transcription.service';
import type { MockInterviewSessionState } from '@/types/mock-interview';
import { MockInterviewState } from '@/types/mock-interview';

interface SessionScreenProps {
  session: MockInterviewSessionState;
  onSkip: () => Promise<void>;
  onDone: () => Promise<void>;
  onRepeat: () => Promise<void>;
  onEnd: () => Promise<void>;
}

const THINKING_LABEL: Partial<Record<MockInterviewState, string>> = {
  [MockInterviewState.Starting]: 'Starting…',
  [MockInterviewState.Generating]: 'Thinking of the next question…',
  [MockInterviewState.Evaluating]: 'Thinking…',
  [MockInterviewState.Scoring]: 'Scoring the interview…',
};

export function SessionScreen({ session, onSkip, onDone, onRepeat, onEnd }: SessionScreenProps) {
  const { state, currentQuestion, setup, questionNumber, currentAnswerText } = session;
  const [busy, setBusy] = useState<'skip' | 'done' | 'end' | 'repeat' | null>(null);
  const [answerReady, setAnswerReady] = useState(currentQuestion?.hasAudio ?? true);
  const levelRingRef = useRef<HTMLDivElement>(null);
  const levelRef = useMicLevel(mockTranscriptionService.getStream());

  // Reset the "I'm ready" gate whenever the on-screen question actually changes.
  const questionKey = currentQuestion?.text ?? '';
  useEffect(() => {
    setAnswerReady(currentQuestion?.hasAudio ?? true);
  }, [questionKey, currentQuestion?.hasAudio]);

  // Live level ring, written directly to the DOM so this does not re-render at animation-frame
  // rate - see use-mic-level.ts.
  useEffect(() => {
    if (state !== MockInterviewState.Listening) return;
    let raf = 0;
    const tick = () => {
      const scale = 1 + Math.min(levelRef.current, 1) * 0.4;
      if (levelRingRef.current) {
        levelRingRef.current.style.transform = `scale(${scale})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, levelRef]);

  const withBusy = (key: typeof busy, action: () => Promise<void>) => async () => {
    setBusy(key);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  };

  const isFollowUp = currentQuestion?.isFollowUp ?? false;
  const totalQuestions = setup?.question_count ?? 0;
  const progressValue = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;
  const showReadyPrompt =
    state === MockInterviewState.Listening && currentQuestion && !currentQuestion.hasAudio && !answerReady;
  const isThinking = state in THINKING_LABEL;
  const canControl = state === MockInterviewState.Speaking || state === MockInterviewState.Listening;

  return (
    <div className="flex-1 flex flex-col items-center overflow-y-auto p-8">
      <div className="w-full max-w-3xl space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {isFollowUp ? 'Follow-up' : `Question ${questionNumber} of ${totalQuestions}`}
            </span>
            {isFollowUp && <Badge variant="secondary">Follow-up</Badge>}
          </div>
          <Progress value={progressValue} />
        </div>

        <Card>
          <CardContent className="flex items-start gap-4 pt-2">
            <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center">
              {state === MockInterviewState.Speaking && (
                <div className="h-8 w-8 rounded-full bg-primary/70 animate-pulse" aria-hidden="true" />
              )}
              {state === MockInterviewState.Listening && (
                <div
                  ref={levelRingRef}
                  className="h-8 w-8 rounded-full bg-primary/30 border-2 border-primary transition-transform"
                  aria-hidden="true"
                />
              )}
              {isThinking && (
                <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/40 border-t-primary animate-spin" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              {currentQuestion && !isThinking ? (
                <p dir="auto" className="text-xl leading-relaxed">
                  {currentQuestion.text}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">{isThinking ? THINKING_LABEL[state] : 'Preparing…'}</p>
              )}

              {state === MockInterviewState.Speaking && (
                <p className="text-xs text-muted-foreground">
                  Interviewer is speaking. Your mic is off while the question plays.
                </p>
              )}
              {state === MockInterviewState.Listening && !showReadyPrompt && (
                <p className="text-xs text-muted-foreground">Listening…</p>
              )}
              {showReadyPrompt && (
                <div className="flex items-center gap-3 pt-1">
                  <p className="text-xs text-muted-foreground">Read the question, then answer.</p>
                  <Button size="sm" variant="outline" onClick={() => setAnswerReady(true)}>
                    I&apos;m ready
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-2">
            <ScrollArea className="h-40">
              {currentAnswerText ? (
                <p dir="auto" className="text-sm leading-relaxed">
                  {currentAnswerText}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Your answer will appear here as you speak.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!canControl || busy !== null || !currentQuestion?.chunks.length}
              onClick={withBusy('repeat', onRepeat)}
            >
              Repeat question
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!canControl || busy !== null}
              onClick={withBusy('skip', onSkip)}
            >
              Skip question
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={state !== MockInterviewState.Listening || busy !== null || (showReadyPrompt ?? false)}
              onClick={withBusy('done', onDone)}
            >
              Done answering
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={busy !== null}
              onClick={withBusy('end', onEnd)}
            >
              End interview
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
