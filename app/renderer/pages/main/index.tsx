import CodeSuggestionsPanel from '@/components/code-suggestions-panel';
import ConfigurationDialog from '@/components/configuration-dialog';
import ControlPanel from '@/components/control-panel';
import HotkeysPanel from '@/components/hotkeys-panel';
import Loading from '@/components/loading';
import ReplySuggestionsPanel from '@/components/reply-suggestions-panel';
import TranscriptPanel from '@/components/transcript-panel';
import { VideoPanel, type VideoPanelHandle } from '@/components/video-panel';
import { useAppStateStore } from '@/hooks/use-app-state-store';
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

  // App state from store
  const appState = useAppStateStore((state) => state.appState);
  const addTranscript = useAppStateStore((state) => state.addTranscript);

  // Listen for transcript updates from Electron
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.transcription) return;

    const unsubscribe = window.electronAPI.transcription.onTranscriptUpdate((transcript) => {
      console.log('[Renderer] Received transcript:', transcript);
      addTranscript(transcript);
    });

    return () => {
      unsubscribe();
    };
  }, [addTranscript]);

  // Listen for transcription errors
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.transcription) return;

    const unsubscribe = window.electronAPI.transcription.onTranscriptionError((error) => {
      console.error('[Renderer] Transcription error:', error);
      // TODO: Show error notification to user
    });

    return () => {
      unsubscribe();
    };
  }, []);

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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    computeAvailable();
    window.addEventListener('resize', computeAvailable, { passive: true });

    return () => {
      window.removeEventListener('resize', computeAvailable);
    };
  }, [computeAvailable]);

  // Recompute when panels mount/unmount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    computeAvailable();
  }, [isStealth, computeAvailable]);

  // Recompute when face swap setting toggles
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    computeAvailable();
  }, [config?.face_swap, computeAvailable]);

  // Recompute when assistant running state or appState becomes available
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    computeAvailable();
  }, [appState?.assistant_state, appState, computeAvailable]);

  // Sign out handling
  const handleSignOut = async () => {
    await logout();
  };

  useEffect(() => {
    if (appState?.transcripts && appState?.transcripts !== transcripts) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTranscripts(appState?.transcripts);
    }
  }, [appState?.transcripts, transcripts]);
  useEffect(() => {
    if (appState?.suggestions && appState?.suggestions !== replySuggestions) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReplySuggestions(appState?.suggestions);
    }
  }, [appState?.suggestions, replySuggestions]);
  useEffect(() => {
    if (appState?.code_suggestions && appState?.code_suggestions !== codeSuggestions) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCodeSuggestions(appState?.code_suggestions);
    }
  }, [appState?.code_suggestions, codeSuggestions]);

  // Redirect to login if not logged in
  const _redirectedToLogin = useRef(false);

  useEffect(() => {
    if (appState?.is_logged_in === false && !_redirectedToLogin.current) {
      _redirectedToLogin.current = true;
      navigate('/auth/login', { replace: true });
    }
  }, [appState?.is_logged_in, navigate]);

  // Show loading if config or app state is not loaded yet
  if (configLoading || !appState) {
    return <Loading disclaimer="Loading your configuration…" />;
  }

  // Show loading if backend is not live
  if (appState && !appState.is_backend_live) {
    return <Loading disclaimer="Initializing context for your device…" />;
  }

  // Show loading if not logged in (fallback)
  if (appState?.is_logged_in === false) {
    return <Loading disclaimer="Redirecting to login…" />;
  }

  // Show loading if GPU server is not live
  if (appState?.is_gpu_server_live === false) {
    return (
      <Loading disclaimer="Initializing AI processing resources… Please allow up to 5 minutes for completion." />
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full bg-background p-1 space-y-1">
      {isStealth && <HotkeysPanel runningState={appState?.assistant_state ?? RunningState.IDLE} />}

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
              runningState={appState?.assistant_state ?? RunningState.IDLE}
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
        runningState={appState?.assistant_state ?? RunningState.IDLE}
        onProfileClick={() => setIsProfileOpen(true)}
        onSignOut={handleSignOut}
      />

      <ConfigurationDialog isOpen={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </div>
  );
}
