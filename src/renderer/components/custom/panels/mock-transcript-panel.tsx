import { ArrowDown } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useAppState } from '@/hooks/use-app-state';
import { useConfigStore } from '@/hooks/use-config-store';
import { cn } from '@/lib/utils';
import { type MockInterviewSessionState, MockInterviewState } from '@/types/mock-interview';

interface Turn {
  key: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
  skipped?: boolean;
  isFollowUp?: boolean;
}

/**
 * Every question-and-answer turn so far, plus the one in progress.
 *
 * Unlike `groupBySpeaker` in the live transcript panel, turns here are never merged: each entry
 * is already a whole question or a whole answer rather than an ASR final, so consecutive same-
 * speaker rows never occur except across a skipped question, where the candidate's row is kept
 * (as "Skipped") rather than dropped - losing the row would make the interviewer's next question
 * read as a second question the candidate never got, with no explanation for the gap.
 */
function buildTurns(session: MockInterviewSessionState): Turn[] {
  const turns: Turn[] = [];

  session.answers.forEach((a, i) => {
    turns.push({ key: `q-${i}`, speaker: 'interviewer', text: a.question });
    turns.push({
      key: `a-${i}`,
      speaker: 'candidate',
      text: a.answer,
      skipped: a.skipped,
    });
  });

  if (session.currentQuestion) {
    turns.push({
      key: 'current-q',
      speaker: 'interviewer',
      text: session.currentQuestion.text,
      isFollowUp: session.currentQuestion.isFollowUp,
    });

    if (
      session.currentAnswerText ||
      session.state === MockInterviewState.Listening ||
      session.state === MockInterviewState.Evaluating
    ) {
      turns.push({ key: 'current-a', speaker: 'candidate', text: session.currentAnswerText });
    }
  }

  return turns;
}

interface MockTranscriptPanelProps {
  session: MockInterviewSessionState;
}

/**
 * The live-mode transcript dock's analogue for a mock session: every turn so far, in the same
 * speaker-labelled, scrollable shape - so the interview itself reads the way an interview
 * transcript reads, rather than as a single card that replaces its own content on every question.
 */
function MockTranscriptPanel({ session }: MockTranscriptPanelProps) {
  const { appState } = useAppState();
  const { config, updateConfig } = useConfigStore();
  const username = appState?.interviewConfig?.fullName || 'You';
  const endRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(() => config?.autoScrollTranscript ?? true);

  useEffect(() => {
    if (typeof config?.autoScrollTranscript === 'boolean') {
      setAutoScroll(config.autoScrollTranscript);
    }
  }, [config?.autoScrollTranscript]);

  // Keyed on values, never on `session` or on any object hanging off it. Main broadcasts a fresh
  // session on every write - which during a question includes every streamed token of the live
  // hint - and the whole state is structure-cloned across IPC, so *every* array and object in it
  // arrives with a new identity each time however little changed. Memoising on any of those
  // rebuilt this list and re-armed the smooth scroll below dozens of times a second for content
  // that was identical. `answers.length` is a sound proxy for the list: entries are appended and
  // never edited in place, and the only other reset is back to empty.
  const turns = useMemo(
    () => buildTurns(session),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      session.answers.length,
      session.currentQuestion?.text,
      session.currentQuestion?.isFollowUp,
      session.currentAnswerText,
      session.state,
    ]
  );
  const totalQuestions = session.setup?.question_count ?? 0;
  const questionNumber = Math.min(session.questionNumber, totalQuestions || session.questionNumber);
  const progressValue = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;
  const isRunning =
    session.state !== MockInterviewState.Idle && session.state !== MockInterviewState.Finished;

  useEffect(() => {
    if (!autoScroll) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, autoScroll]);

  return (
    <Card className="relative flex flex-col w-full h-full bg-card p-0 rounded-md gap-1">
      <div className="px-2 py-1.5 shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {isRunning && (
            <span
              className="h-2 w-2 rounded-full bg-destructive animate-pulse shrink-0"
              aria-hidden="true"
            />
          )}
          <h3 className="font-semibold text-foreground text-xs">Mock Interview</h3>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {totalQuestions > 0 && (
            <span className="text-xs text-muted-foreground">
              Question {questionNumber} of {totalQuestions}
            </span>
          )}
          {/* Same control and the same stored preference as the live transcript dock. Without it
              every ASR partial pulled the panel back to the bottom, so re-reading an earlier
              answer mid-interview was not possible while the candidate was still speaking. */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={autoScroll}
              onCheckedChange={(v) => {
                const enabled = v === true;
                setAutoScroll(enabled);
                updateConfig({ autoScrollTranscript: enabled }).catch((e) =>
                  console.error('Failed to persist auto-scroll setting', e)
                );
              }}
              className="h-4 w-4 rounded border-border bg-background"
              aria-label="Enable auto-scroll"
            />
            <span className="select-none">Auto-scroll</span>
          </label>
        </div>
      </div>

      {totalQuestions > 0 && <Progress value={progressValue} className="h-1 rounded-none shrink-0" />}

      <div className="flex-1 overflow-y-auto px-2 py-1">
        {turns.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center p-4">
            <p className="text-sm text-muted-foreground">Preparing your first question…</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {turns.map((turn) => (
              <div key={turn.key} className="flex gap-2 py-2 max-w-3xl mx-auto">
                <span
                  className={cn(
                    'w-20 shrink-0 truncate text-xs font-semibold',
                    turn.speaker === 'candidate' ? 'text-primary' : 'text-foreground'
                  )}
                  title={turn.speaker === 'candidate' ? username : 'Interviewer'}
                >
                  {turn.speaker === 'candidate' ? username : 'Interviewer'}
                </span>

                <div className="min-w-0 flex-1 space-y-1">
                  {turn.isFollowUp && (
                    <Badge variant="secondary" className="text-[10px]">
                      Follow-up
                    </Badge>
                  )}
                  {turn.skipped ? (
                    <p className="text-sm text-muted-foreground italic">Skipped</p>
                  ) : (
                    <p
                      dir="auto"
                      className="text-sm text-foreground/90 leading-relaxed wrap-break-word"
                    >
                      {turn.text}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {!autoScroll && (
        <Button
          size="icon-sm"
          className="absolute bottom-3 right-3 rounded-full shadow-md bg-blue-600 text-white hover:bg-blue-600/90"
          onClick={() => endRef.current?.scrollIntoView({ behavior: 'smooth' })}
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="size-4" />
        </Button>
      )}
    </Card>
  );
}

export default React.memo(MockTranscriptPanel);
