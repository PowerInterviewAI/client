import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { LoadingPage } from '@/components/custom/loading';
import { useAppState } from '@/hooks/use-app-state';
import { useMockInterview } from '@/hooks/use-mock-interview';
import useTools from '@/hooks/use-tools';
import { getElectron } from '@/lib/utils';
import { type MockInterviewSetup, MockInterviewState } from '@/types/mock-interview';

import { ReportScreen } from './report';
import { SessionScreen } from './session';
import { SetupScreen } from './setup';

/**
 * Mock interview: styled after the live control bar's own panels now rather than against them -
 * see `session.tsx`. It still needs no always-on-top and no taskbar/Dock hiding:
 * `shouldHideSurfaces()` only reacts to stealth and `RunningState.Running`, and a mock session
 * sets neither.
 *
 * Known gap: leaving this route mid-session currently ends it outright (scoring whatever was
 * answered) rather than raising a confirmation dialog first, the way closing the app does via
 * the window-close guard. That guard is the one that matters most - it covers Alt+F4, the
 * taskbar close button and Cmd+Q - and is fully wired. A "confirm before navigating away"
 * dialog reusing `save-history-dialog.tsx`'s subject-aware dispatch is a follow-up.
 */
export default function MockInterviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { appState } = useAppState();
  const { session, startSession, endSession, skipQuestion, answerFinished, repeatQuestion, clear } =
    useMockInterview();
  const { exportMockReport } = useTools();
  const redirectedToLogin = useRef(false);
  const endedOnUnmount = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  // The control bar's setup dialog has already collected and validated a setup and shown its own
  // headphone notice by the time it navigates here - it hands the result off through router state
  // rather than calling `startSession` itself, so only one `useMockInterview()` instance is ever
  // mounted while the session starts (see the dialog's own comment on this).
  const pendingSetup = (location.state as { pendingSetup?: MockInterviewSetup } | null)
    ?.pendingSetup;
  const autoStartRequested = useRef(false);
  // A failed auto-start still leaves `autoStartRequested` true (it is one-shot, not a retry
  // guard), so this is what lets the render fall through to the full setup form instead of
  // being stuck on a loading screen for a start that is never coming.
  const [autoStartFailed, setAutoStartFailed] = useState(false);

  useEffect(() => {
    if (!pendingSetup || autoStartRequested.current) return;
    if (sessionRef.current && sessionRef.current.state !== MockInterviewState.Idle) return;
    autoStartRequested.current = true;
    startSession(pendingSetup).catch((error) => {
      console.error('Failed to auto-start mock interview:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start the mock interview');
      setAutoStartFailed(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSetup]);

  useEffect(() => {
    getElectron()?.setStealth(false);
  }, []);

  useEffect(() => {
    if (appState?.isLoggedIn !== false || redirectedToLogin.current) return;
    redirectedToLogin.current = true;
    navigate('/auth/login', { replace: true });
  }, [appState?.isLoggedIn, navigate]);

  // Ends an in-progress session if this page unmounts without going through the report screen -
  // see the module docstring for why this is a fallback rather than the intended UX. Reads
  // `sessionRef` rather than `session` directly: this effect only runs once (mount/unmount), so a
  // cleanup closing over `session` would see whatever it was at mount - almost always `null`,
  // before a session has even started - never the live state at the moment the page actually
  // unmounts. The ref is kept current on every render instead.
  useEffect(() => {
    return () => {
      if (endedOnUnmount.current) return;
      const state = sessionRef.current?.state;
      if (state && state !== MockInterviewState.Idle && state !== MockInterviewState.Finished) {
        endedOnUnmount.current = true;
        void endSession();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (appState?.isLoggedIn === false) return <LoadingPage disclaimer="Redirecting to login…" />;
  if (appState?.isLoggedIn === null || !appState) return <LoadingPage disclaimer="Loading…" />;

  const state = session?.state ?? MockInterviewState.Idle;

  if (state === MockInterviewState.Finished) {
    return (
      <ReportScreen
        session={session!}
        onExport={(format) => exportMockReport(format)}
        onPracticeAgain={async () => {
          await clear();
        }}
        onDone={async () => {
          await clear();
          navigate('/main');
        }}
      />
    );
  }

  if (state !== MockInterviewState.Idle && session) {
    return (
      <SessionScreen
        session={session}
        onSkip={skipQuestion}
        onDone={answerFinished}
        onRepeat={repeatQuestion}
        onEnd={endSession}
      />
    );
  }

  // Still Idle with a setup in hand and the auto-start already requested: showing the full
  // setup form here would be a step backward from the dialog that just collected the same
  // fields, so this waits for the state to move rather than falling through to it.
  if (pendingSetup && autoStartRequested.current && !autoStartFailed) {
    return <LoadingPage disclaimer="Starting mock interview…" />;
  }

  return <SetupScreen onStart={startSession} />;
}
