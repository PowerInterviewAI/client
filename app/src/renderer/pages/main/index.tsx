import CodeSuggestionsPanel from '@/components/code-suggestions-panel';
import ConfigurationDialog from '@/components/configuration-dialog';
import ControlPanel from '@/components/control-panel';
import HotkeysPanel from '@/components/hotkeys-panel';
import Loading from '@/components/loading';
import ReplySuggestionsPanel from '@/components/reply-suggestions-panel';
import TranscriptPanel from '@/components/transcript-panel';
import { VideoPanel, type VideoPanelHandle } from '@/components/video-panel';
import { useAppState } from '@/hooks/use-app-state';
import useAuth from '@/hooks/use-auth';
import useIsStealthMode from '@/hooks/use-is-stealth-mode';
import { useConfigStore } from '@/hooks/use-config-store';
import { useAssistantState } from '@/hooks/use-assistant-state';
import { RunningState } from '@/types/app-state';
import { type CodeSuggestion, type ReplySuggestion } from '@/types/suggestion';
import { type Transcript } from '@/types/transcript';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MainPage() {
  console.log('Rendering MainPage');

  const { logout } = useAuth();
  const navigate = useNavigate();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { config, isLoading: configLoading, loadConfig } = useConfigStore();
  const { setVideoPanelRef } = useAssistantState();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [replySuggestions, setReplySuggestions] = useState<ReplySuggestion[]>([]);
  const [codeSuggestions, setCodeSuggestions] = useState<CodeSuggestion[]>([]);
  const videoPanelRef = useRef<VideoPanelHandle>(null);
  const [transcriptHeight, setTranscriptHeight] = useState<number | null>(null);
  const [suggestionHeight, setSuggestionHeight] = useState<number | null>(null);

  // App state from context
  const { appState } = useAppState();

  // Register videoPanelRef with assistant state
  useEffect(() => {
    setVideoPanelRef(videoPanelRef as React.RefObject<VideoPanelHandle>);
  }, [setVideoPanelRef]);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const hasReplySuggestions = replySuggestions.length > 0;
  const hasCodeSuggestions = codeSuggestions.length > 0;
  const hasTranscripts = transcripts.length > 0;
  const hideVideoPanel = !config?.face_swap;
  const hideTranscriptPanel = hasCodeSuggestions && !hasTranscripts;

  const hasSuggestions = hasReplySuggestions || hasCodeSuggestions;
  const suggestionPanelCount = (hasReplySuggestions ? 1 : 0) + (hasCodeSuggestions ? 1 : 0);

  // stable compute function so other effects can trigger a recompute
  // include `suggestionPanelCount` in deps to avoid stale closure
  const computeAvailable = useCallback(() => {
    if (typeof window === 'undefined') return;
    const title = document.getElementById('titlebar')?.getBoundingClientRect().height || 0;
    let hot = document.getElementById('hotkeys-panel')?.getBoundingClientRect().height || 0;
    let control = document.getElementById('control-panel')?.getBoundingClientRect().height || 0;
    let video = document.getElementById('video-panel')?.getBoundingClientRect().height || 0;
    const extra = 12; // spacing/padding between elements

    if (hot > 0) hot += 4; // account for border
    if (control > 0) control += 4; // account for border
    if (video > 0) video += 4; // account for border

    setTranscriptHeight(
      Math.max(100, window.innerHeight - (title + hot + control + video + extra))
    );
    if (suggestionPanelCount > 0) {
      setSuggestionHeight(
        Math.max(
          100,
          window.innerHeight - (title + hot + control + extra) - (suggestionPanelCount - 1) * 4
        ) / suggestionPanelCount
      );
    } else {
      setSuggestionHeight(0);
    }
  }, [suggestionPanelCount]);
  const isStealth = useIsStealthMode();

  // compute panel height by subtracting hotkeys/control/video heights from viewport
  // placed here so hooks order is stable across renders (avoids conditional-hook errors)
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    computeAvailable();
    window.addEventListener('resize', computeAvailable, { passive: true });

    return () => {
      window.removeEventListener('resize', computeAvailable);
    };
  }, [computeAvailable]);

  // Recompute when panels mount/unmount
  useEffect(() => {
    computeAvailable();
  }, [
    hasCodeSuggestions,
    hasReplySuggestions,
    hasTranscripts,
    hideVideoPanel,
    hideTranscriptPanel,
    computeAvailable,
  ]);

  // Recompute when stealth mode toggles
  useEffect(() => {
    computeAvailable();
  }, [isStealth, computeAvailable]);

  // Recompute when face swap setting toggles
  useEffect(() => {
    computeAvailable();
  }, [config?.face_swap, computeAvailable]);

  // Recompute when assistant running state or appState becomes available
  useEffect(() => {
    computeAvailable();
  }, [appState?.assistantState, appState, computeAvailable]);

  // Sign out handling
  const handleSignOut = async () => {
    await logout();
  };

  useEffect(() => {
    if (appState?.transcripts && appState?.transcripts !== transcripts) {
      setTranscripts(appState?.transcripts);
    }
  }, [appState?.transcripts, transcripts]);
  useEffect(() => {
    if (appState?.replySuggestions && appState?.replySuggestions !== replySuggestions) {
      setReplySuggestions(appState?.replySuggestions);
    }
  }, [appState?.replySuggestions, replySuggestions]);
  useEffect(() => {
    if (appState?.codeSuggestions && appState?.codeSuggestions !== codeSuggestions) {
      setCodeSuggestions(appState?.codeSuggestions);
    }
  }, [appState?.codeSuggestions, codeSuggestions]);

  // Redirect to login if not logged in
  const _redirectedToLogin = useRef(false);

  useEffect(() => {
    if (appState?.isLoggedIn === false && !_redirectedToLogin.current) {
      _redirectedToLogin.current = true;
      navigate('/auth/login', { replace: true });
    }
  }, [appState?.isLoggedIn, navigate]);

  // Show loading if not logged in (fallback)
  if (appState?.isLoggedIn === false) {
    return <Loading disclaimer="Redirecting to login…" />;
  }

  // Show loading if auth status is unknown
  if (appState?.isLoggedIn === null) {
    return <Loading disclaimer="Checking authentication status…" />;
  }

  // Show loading if config or app state is not loaded yet
  if (configLoading || !appState) {
    return <Loading disclaimer="Loading…" />;
  }

  // Show loading if backend is not live
  if (appState && !appState.isBackendLive) {
    return <Loading disclaimer="Loading…" />;
  }

  if (appState?.isGpuServerLive === false) {
    // Show loading if GPU server is not live
    return <Loading disclaimer="Initializing AI resources… This may take several minutes" />;
  }

  return (
    <div className="flex-1 flex flex-col w-full bg-background p-1 space-y-1">
      {isStealth && <HotkeysPanel runningState={appState?.assistantState ?? RunningState.IDLE} />}

      <div className="flex-1 flex overflow-y-hidden gap-1">
        {/* Left Column: Video + Transcription */}
        <div
          className={`flex flex-col ${hasSuggestions ? 'w-80' : 'flex-1'} gap-1 transition-all duration-300 ease-in-out`}
          hidden={hideVideoPanel && hideTranscriptPanel}
        >
          {/* Video Panel - Small and compact */}
          <div id="video-panel" className="h-45 w-full max-w-80 mx-auto" hidden={hideVideoPanel}>
            <VideoPanel
              ref={videoPanelRef}
              runningState={appState?.assistantState ?? RunningState.IDLE}
            />
          </div>

          {/* Transcription Panel - Fill remaining space with scroll */}
          {(!hideTranscriptPanel || !hideVideoPanel) && (
            <TranscriptPanel
              transcripts={transcripts}
              style={(transcriptHeight ?? 0) > 0 ? { height: `${transcriptHeight}px` } : undefined}
            />
          )}
        </div>

        {/* Right Column: Main Suggestions Panel */}
        {(hasReplySuggestions || hasCodeSuggestions) && (
          <div className="flex-1 flex flex-col gap-1 h-full overflow-auto">
            {hasCodeSuggestions && (
              <CodeSuggestionsPanel
                codeSuggestions={codeSuggestions}
                style={{ height: `${suggestionHeight}px` }}
              />
            )}
            {hasReplySuggestions && (
              <ReplySuggestionsPanel
                suggestions={replySuggestions}
                style={{ height: `${suggestionHeight}px` }}
              />
            )}
          </div>
        )}
      </div>

      <ControlPanel
        runningState={appState?.assistantState ?? RunningState.IDLE}
        onProfileClick={() => setIsProfileOpen(true)}
        onSignOut={handleSignOut}
      />

      <ConfigurationDialog isOpen={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </div>
  );
}
