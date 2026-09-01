import { Check, Lightbulb, RotateCcw, Square, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  BAR_ACTIVE,
  BAR_GHOST,
  BAR_ICON_BUTTON,
} from '@/components/custom/control-panel/bar';
import LiveSuggestionsPanel from '@/components/custom/panels/live-suggestions-panel';
import MockTranscriptPanel from '@/components/custom/panels/mock-transcript-panel';
import ZoomControl from '@/components/custom/zoom-control';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMicLevel } from '@/hooks/use-mic-level';
import { useMockLiveSuggestions } from '@/hooks/use-mock-live-suggestions';
import { cn } from '@/lib/utils';
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
  // Reached by "End interview", and the only state that had neither a spinner nor a line: the
  // screen sat unchanged with a dead control bar while the session was being wound up.
  [MockInterviewState.Stopping]: 'Ending the interview…',
};

export function SessionScreen({ session, onSkip, onDone, onRepeat, onEnd }: SessionScreenProps) {
  const { state, currentQuestion } = session;
  const [busy, setBusy] = useState<'skip' | 'done' | 'end' | 'repeat' | null>(null);
  const [answerReady, setAnswerReady] = useState(currentQuestion?.hasAudio ?? true);
  const levelRingRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const levelRef = useMicLevel(mockTranscriptionService.getStream());
  const { enabled: hintsEnabled, toggle: toggleHints } = useMockLiveSuggestions();

  // This screen mounts once per session (SetupScreen unmounts, this replaces it) and stays
  // mounted across every question until the report screen takes over - not a real navigation, so
  // nothing moves focus here on its own. Runs once on mount rather than per-question: within-
  // session updates (state, question text) are already announced through the aria-live region
  // below, and refocusing the heading on every question would fight the candidate's own focus
  // while they are mid-interaction with a control.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Reset the "I'm ready" gate whenever the on-screen question actually changes.
  const questionKey = currentQuestion?.text ?? '';
  useEffect(() => {
    setAnswerReady(currentQuestion?.hasAudio ?? true);
  }, [questionKey, currentQuestion?.hasAudio]);

  // Live level ring, written directly to the DOM so this does not re-render at animation-frame
  // rate - see use-mic-level.ts.
  //
  // The ring carries no `transition-transform`: this writes `transform` every frame, and a
  // transition on the same property makes the browser interpolate towards each new value instead
  // of applying it, so the ring lags the voice it is meant to track and never reaches the peaks.
  //
  // Reduced motion stops the loop rather than damping it. The ring is decorative - the transcript
  // panel is what actually reports that speech is being heard - so a static ring loses nothing.
  useEffect(() => {
    if (state !== MockInterviewState.Listening) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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

  const showReadyPrompt =
    state === MockInterviewState.Listening && currentQuestion && !currentQuestion.hasAudio && !answerReady;
  const isThinking = state in THINKING_LABEL;
  const canControl = state === MockInterviewState.Speaking || state === MockInterviewState.Listening;
  // Shown for the whole active session once hints are on, not just once the first one arrives -
  // otherwise the panel would pop in mid-question the moment the first hint request resolves,
  // shifting the transcript panel it sits beside.
  const showHintsPanel =
    hintsEnabled && state !== MockInterviewState.Idle && state !== MockInterviewState.Finished;

  const statusText = isThinking
    ? THINKING_LABEL[state]
    : state === MockInterviewState.Speaking
      ? 'Interviewer is speaking. Your mic is off while the question plays.'
      : state === MockInterviewState.Listening
        ? showReadyPrompt
          ? 'Read the question, then answer.'
          : 'Listening…'
        : '';

  return (
    <div className="flex-1 flex flex-col w-full bg-background p-1 space-y-1">
      {/* Visually hidden: the panels below carry their own visible headings, but the route still
          needs a landmark for screen-reader heading navigation to land on. */}
      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        Mock interview session
      </h1>

      <div className="flex-1 flex flex-col overflow-y-hidden gap-1">
        <div className="flex-1 min-h-0 flex gap-1">
          <div className="flex-1 min-w-0">
            <MockTranscriptPanel session={session} />
          </div>
          {showHintsPanel && (
            <div className="flex-1 min-w-0">
              <LiveSuggestionsPanel
                suggestions={session.liveHints}
                isRunning={state === MockInterviewState.Listening}
              />
            </div>
          )}
        </div>

        {/* Status line: what is currently happening, plus the one control that only makes sense
            in the moment (the "I'm ready" gate for a question with no audio). Kept as a single
            slim row rather than a big centred card - the transcript panel above is what the
            candidate actually reads. */}
        <div
          className="flex items-center justify-center gap-2 py-1 text-xs text-muted-foreground shrink-0"
          aria-live="polite"
        >
          <div className="h-4 w-4 flex items-center justify-center shrink-0" aria-hidden="true">
            {state === MockInterviewState.Speaking && (
              <span className="h-2.5 w-2.5 rounded-full bg-primary/70 animate-pulse" />
            )}
            {state === MockInterviewState.Listening && (
              <span
                ref={levelRingRef}
                className="h-2.5 w-2.5 rounded-full bg-primary/30 border-2 border-primary"
              />
            )}
            {isThinking && (
              <span className="h-3 w-3 rounded-full border-2 border-muted-foreground/40 border-t-primary animate-spin" />
            )}
          </div>
          {statusText && <span>{statusText}</span>}
          {showReadyPrompt && (
            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setAnswerReady(true)}>
              I&apos;m ready
            </Button>
          )}
        </div>
      </div>

      {/* Control bar - the live assistant's row, rebuilt around this mode's actions: same 32px
          height, same icon-button tokens, same reading order (the one consequential action first,
          then the things that shape the turn), same single hairline before the settings, and zoom
          held at the right edge by ml-auto because it changes how the app is viewed rather than
          what it does. */}
      <div className="flex items-center gap-4 px-1 pb-1 pt-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              className="h-8 gap-1.5 rounded-lg px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-600/90"
              disabled={state !== MockInterviewState.Listening || busy !== null || (showReadyPrompt ?? false)}
              onClick={withBusy('done', onDone)}
            >
              <Check className="h-3.5 w-3.5" />
              Done answering
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Submit your answer and move on</p>
          </TooltipContent>
        </Tooltip>

        <div className="h-5 w-px bg-border" aria-hidden="true" />

        {/* What to do with the question on screen */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(BAR_ICON_BUTTON, BAR_GHOST)}
                disabled={!canControl || busy !== null || !currentQuestion?.chunks.length}
                aria-label="Repeat question"
                onClick={withBusy('repeat', onRepeat)}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Repeat question</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(BAR_ICON_BUTTON, BAR_GHOST)}
                disabled={!canControl || busy !== null}
                aria-label="Skip question"
                onClick={withBusy('skip', onSkip)}
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Skip question</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* What the session produces, and how to end it */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(BAR_ICON_BUTTON, hintsEnabled ? BAR_ACTIVE : BAR_GHOST)}
                aria-pressed={hintsEnabled}
                aria-label="Toggle live suggestions"
                onClick={toggleHints}
              >
                <Lightbulb className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Live Suggestions: {hintsEnabled ? 'On' : 'Off'}</p>
              <p className="text-xs text-muted-foreground">
                {hintsEnabled
                  ? 'Shows what the live assistant would answer'
                  : 'Practise without a hint'}
              </p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(BAR_ICON_BUTTON, 'text-destructive hover:text-destructive hover:bg-destructive/10')}
                disabled={busy !== null}
                aria-label="End interview"
                onClick={withBusy('end', onEnd)}
              >
                <Square className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>End interview</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="ml-auto">
          <ZoomControl />
        </div>
      </div>
    </div>
  );
}
