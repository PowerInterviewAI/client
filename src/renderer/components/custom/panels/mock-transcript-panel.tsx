import React, { useEffect, useMemo, useRef } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAppState } from '@/hooks/use-app-state';
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
  const username = appState?.interviewConfig?.fullName || 'You';
  const endRef = useRef<HTMLDivElement>(null);

  const turns = useMemo(() => buildTurns(session), [session]);
  const totalQuestions = session.setup?.question_count ?? 0;
  const questionNumber = Math.min(session.questionNumber, totalQuestions || session.questionNumber);
  const progressValue = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;
  const isRunning =
    session.state !== MockInterviewState.Idle && session.state !== MockInterviewState.Finished;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

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
        {totalQuestions > 0 && (
          <span className="text-xs text-muted-foreground shrink-0">
            Question {questionNumber} of {totalQuestions}
          </span>
        )}
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
    </Card>
  );
}

export default React.memo(MockTranscriptPanel);
