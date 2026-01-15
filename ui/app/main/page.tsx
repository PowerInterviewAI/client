'use client';

import CodeSuggestionsPanel from '@/components/code-suggestions-panel';
import ConfigurationDialog from '@/components/configuration-dialog';
import ControlPanel from '@/components/control-panel';
import HotkeysPanel from '@/components/hotkeys-panel';
import Loading from '@/components/loading';
import SuggestionsPanel from '@/components/suggestions-panel';
import TranscriptPanel from '@/components/transcript-panel';
import { VideoPanel, VideoPanelHandle } from '@/components/video-panel';
import { useAppState } from '@/hooks/app-state';
import { useStartAssistant, useStopAssistant } from '@/hooks/assistant';
import { useAudioInputDevices, useAudioOutputDevices } from '@/hooks/audio-devices';
import { useConfigQuery, useUpdateConfig } from '@/hooks/config';
import useAuth from '@/hooks/use-auth';
import useIsStealthMode from '@/hooks/use-is-stealth-mode';
import { RunningState } from '@/types/appState';
import { Config } from '@/types/config';
import { Transcript } from '@/types/transcript';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export default function Home() {
  const router = useRouter();
  const { logout } = useAuth();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [config, setConfig] = useState<Config>();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const videoPanelRef = useRef<VideoPanelHandle>(null);
  const [transcriptHeight, setTranscriptHeight] = useState<number | null>(null);
  const [suggestionHeight, setSuggestionHeight] = useState<number | null>(null);

  // Queries
  const { data: configFetched } = useConfigQuery();
  const { data: audioInputDevices } = useAudioInputDevices(1000);
  const { data: audioOutputDevices } = useAudioOutputDevices(1000);
  const { data: appState, error: appStateError } = useAppState(100);

  const replySuggestions = appState?.suggestions ?? [];
  const hasReplySuggestions = replySuggestions.length > 0;

  const codeSuggestions = appState?.code_suggestions ?? [];
  const hasCodeSuggestions = codeSuggestions.length > 0;

  const hasSuggestions = hasReplySuggestions || hasCodeSuggestions;
  const suggestionPanelCount = (hasReplySuggestions ? 1 : 0) + (hasCodeSuggestions ? 1 : 0);

  // stable compute function so other effects can trigger a recompute
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
      Math.max(100, window.innerHeight - (title + hot + control + video + extra)),
    );
    setSuggestionHeight(
      Math.max(
        100,
        window.innerHeight - (title + hot + control + extra) - (suggestionPanelCount - 1) * 4,
      ) / (suggestionPanelCount ?? 1),
    );
  }, []);
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

  // Recompute when stealth mode toggles
  useEffect(() => {
    computeAvailable();
  }, [isStealth, computeAvailable]);

  // Recompute when video control setting toggles
  useEffect(() => {
    computeAvailable();
  }, [config?.enable_video_control, computeAvailable]);

  // Recompute when assistant running state or appState becomes available
  useEffect(() => {
    computeAvailable();
  }, [appState?.assistant_state, appState, computeAvailable]);

  // Mutations
  const updateConfigMutation = useUpdateConfig();
  const startMutation = useStartAssistant(videoPanelRef, config);
  const stopMutation = useStopAssistant(videoPanelRef);

  // Theme handling
  const handleThemeToggle = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);

    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Sign out handling
  const handleSignOut = async () => {
    await logout();
  };

  const updateConfig = (cfg: Partial<Config>) => {
    const newConfig = { ...config, ...cfg } as Config;
    setConfig(newConfig);
    updateConfigMutation.mutate(cfg);
  };

  useEffect(() => {
    if (configFetched) {
      setConfig(configFetched);
    }
  }, [configFetched]);
  useEffect(() => {
    if (appState?.transcripts && appState?.transcripts !== transcripts) {
      setTranscripts(appState?.transcripts);
    }
  }, [appState?.transcripts, transcripts]);

  // Load theme
  useEffect(() => {
    // Check localStorage or system preference
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Redirect to login if not logged in
  useEffect(() => {
    if (appState?.is_logged_in === false) {
      router.push('/auth/login');
    }
  }, [appState, router]);

  // Show loading if app state is not loaded yet
  if (!appState && !appStateError) {
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
      {isStealth && <HotkeysPanel />}

      <div className="flex-1 flex overflow-y-hidden gap-1">
        {/* Left Column: Video + Transcription */}
        <div
          className={`flex flex-col ${hasSuggestions ? 'w-80' : 'flex-1'} gap-1 transition-all duration-300 ease-in-out`}
        >
          {/* Video Panel - Small and compact */}
          <div
            id="video-panel"
            className="h-45 w-full max-w-80 mx-auto"
            hidden={!config?.enable_video_control}
          >
            <VideoPanel
              ref={videoPanelRef}
              runningState={
                appStateError
                  ? RunningState.STOPPED
                  : (appState?.assistant_state ?? RunningState.IDLE)
              }
              photo={config?.interview_conf?.photo ?? ''}
              cameraDeviceName={config?.camera_device_name ?? ''}
              videoWidth={config?.video_width ?? 640}
              videoHeight={config?.video_height ?? 480}
              enableFaceSwap={config?.enable_face_swap ?? true}
              enableFaceEnhance={config?.enable_face_enhance ?? false}
            />
          </div>

          {/* Transcription Panel - Fill remaining space with scroll */}
          <TranscriptPanel
            username={config?.interview_conf?.username ?? ''}
            transcripts={transcripts ?? []}
            style={(transcriptHeight ?? 0) > 0 ? { height: `${transcriptHeight}px` } : undefined}
          />
        </div>

        {/* Right Column: Main Suggestions Panel */}
        {(hasReplySuggestions || hasCodeSuggestions) && (
          <div className="flex-1 flex flex-col gap-1 h-full overflow-auto">
            {hasReplySuggestions && (
              <SuggestionsPanel
                suggestions={replySuggestions}
                style={{ height: `${suggestionHeight}px` }}
              />
            )}
            {hasCodeSuggestions && (
              <CodeSuggestionsPanel
                codeSuggestions={codeSuggestions}
                style={{ height: `${suggestionHeight}px` }}
              />
            )}
          </div>
        )}
      </div>

      <ControlPanel
        runningState={appState?.assistant_state ?? RunningState.IDLE}
        startMutation={startMutation}
        stopMutation={stopMutation}
        audioInputDevices={audioInputDevices ?? []}
        audioOutputDevices={audioOutputDevices ?? []}
        onProfileClick={() => setIsProfileOpen(true)}
        onSignOut={handleSignOut}
        onThemeToggle={handleThemeToggle}
        isDark={isDark}
        config={config}
        updateConfig={updateConfig}
      />

      <ConfigurationDialog
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        initialPhoto={config?.interview_conf?.photo ?? ''}
        initialName={config?.interview_conf?.username ?? ''}
        initialProfileData={config?.interview_conf?.profile_data ?? ''}
        initialJobDescription={config?.interview_conf?.job_description ?? ''}
        updateConfig={updateConfig}
      />
    </div>
  );
}
