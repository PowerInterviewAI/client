import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { LoadingPage } from '@/components/custom/loading';
import { useAppState } from '@/hooks/use-app-state';
import { useMockInterview } from '@/hooks/use-mock-interview';
import useTools from '@/hooks/use-tools';
import { getElectron } from '@/lib/utils';
import { MockInterviewState } from '@/types/mock-interview';

import { ReportScreen } from './report';
import { SessionScreen } from './session';
import { SetupScreen } from './setup';

/**
 * Mock interview: opposite visual contract from the live control bar, deliberately - this is
 * practice the candidate looks straight at, not a compact overlay tuned for peripheral reading
 * during a call. It needs no always-on-top and no taskbar/Dock hiding: `shouldHideSurfaces()`
 * only reacts to stealth and `RunningState.Running`, and a mock session sets neither.
 *
 * Known gap: leaving this route mid-session currently ends it outright (scoring whatever was
 * answered) rather than raising a confirmation dialog first, the way closing the app does via
 * the window-close guard. That guard is the one that matters most - it covers Alt+F4, the
 * taskbar close button and Cmd+Q - and is fully wired. A "confirm before navigating away"
 * dialog reusing `save-history-dialog.tsx`'s subject-aware dispatch is a follow-up.
 */
export default function MockInterviewPage() {
  const navigate = useNavigate();
  const { appState } = useAppState();
  const { session, startSession, endSession, skipQuestion, answerFinished, repeatQuestion, clear } =
    useMockInterview();
  const { exportMockReport } = useTools();
  const redirectedToLogin = useRef(false);
  const endedOnUnmount = useRef(false);

  useEffect(() => {
    getElectron()?.setStealth(false);
  }, []);

  useEffect(() => {
    if (appState?.isLoggedIn !== false || redirectedToLogin.current) return;
    redirectedToLogin.current = true;
    navigate('/auth/login', { replace: true });
  }, [appState?.isLoggedIn, navigate]);

  // Ends an in-progress session if this page unmounts without going through the report screen -
  // see the module docstring for why this is a fallback rather than the intended UX.
  useEffect(() => {
    return () => {
      if (endedOnUnmount.current) return;
      const state = session?.state;
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

  return <SetupScreen onStart={startSession} />;
}
