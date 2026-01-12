'use client';

import ControlPanel from '@/components/control-panel';
import HotkeysPanel from '@/components/hotkeys-panel';
import Loading from '@/components/loading';
import ProfileDialog from '@/components/profile-dialog';
import SuggestionsPanel from '@/components/suggestions-panel';
import TranscriptPanel from '@/components/transcript-panel';
import { VideoPanel, VideoPanelHandle } from '@/components/video-panel';
import { useAppState } from '@/hooks/app-state';
import { useStartAssistant, useStopAssistant } from '@/hooks/assistant';
import { useAudioInputDevices, useAudioOutputDevices } from '@/hooks/audio-devices';
import { useConfigQuery, useUpdateConfig } from '@/hooks/config';
import useAuth from '@/hooks/use-auth';
import { RunningState } from '@/types/appState';
import { Config } from '@/types/config';
import { Transcript } from '@/types/transcript';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLayoutEffect } from 'react';

export default function Home() {
  const router = useRouter();
  const { logout } = useAuth();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [config, setConfig] = useState<Config>();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const videoPanelRef = useRef<VideoPanelHandle>(null);
  const [panelHeight, setPanelHeight] = useState<number | null>(null);

  // Queries
  const { data: configFetched } = useConfigQuery();
  const { data: audioInputDevices } = useAudioInputDevices(1000);
  const { data: audioOutputDevices } = useAudioOutputDevices(1000);
  const { data: appState, error: appStateError } = useAppState(100);

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
    if (appState && !appState.is_logged_in) {
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
  if (appState && !appState.is_logged_in) {
    return <Loading disclaimer="Redirecting to login…" />;
  }

  // Show loading if GPU server is not live
  if (appState && !appState.is_gpu_server_live) {
    return (
      <Loading disclaimer="Initializing AI processing resources… Please allow up to 5 minutes for completion." />
    );
  }

  // compute panel height by subtracting hotkeys/control/video heights from viewport
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const compute = () => {
      const title = document.getElementById('titlebar')?.getBoundingClientRect().height || 0;
      const hot = document.getElementById('hotkeys-panel')?.getBoundingClientRect().height || 0;
      const control = document.getElementById('control-panel')?.getBoundingClientRect().height || 0;
      const video = document.getElementById('video-panel')?.getBoundingClientRect().height || 0;
      const extra = 24; // spacing/padding between elements
      const available = Math.max(200, window.innerHeight - (title + hot + control + video + extra));
      setPanelHeight(available);
    };

    compute();
    window.addEventListener('resize', compute, { passive: true });
    return () => window.removeEventListener('resize', compute);
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full bg-background p-1 space-y-1">
      <HotkeysPanel />

      <div className="flex-1 flex overflow-y-hidden gap-1">
        {/* Left Column: Video + Transcription */}
        <div className="flex flex-col gap-1 w-1/2 md:w-96 shrink-0 min-h-0">
          {/* Video Panel - Small and compact */}
          <div
            id="video-panel"
            className="h-48 shrink-0 border rounded-xl overflow-hidden"
            hidden={!config?.enable_video_control}
          >
            <VideoPanel
              ref={videoPanelRef}
              runningState={
                appStateError
                  ? RunningState.STOPPED
                  : (appState?.assistant_state ?? RunningState.IDLE)
              }
              photo={config?.profile?.photo ?? ''}
              cameraDeviceName={config?.camera_device_name ?? ''}
              videoWidth={config?.video_width ?? 640}
              videoHeight={config?.video_height ?? 480}
              enableFaceSwap={config?.enable_face_swap ?? true}
              enableFaceEnhance={config?.enable_face_enhance ?? false}
            />
          </div>

          {/* Transcription Panel - Fill remaining space with scroll */}
          <div className="flex-1 min-h-0 rounded-lg overflow-hidden">
            <TranscriptPanel
              username={config?.profile?.username ?? ''}
              transcripts={transcripts ?? []}
              style={panelHeight ? { height: `${panelHeight}px` } : undefined}
            />
          </div>
        </div>

        {/* Right Column: Main Suggestions Panel */}
        <div className="w-1/2 md:flex-1 min-w-60 min-h-0 rounded-lg">
          <SuggestionsPanel suggestions={appState?.suggestions} style={panelHeight ? { height: `${panelHeight}px` } : undefined} />
        </div>
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

      <ProfileDialog
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        initialPhoto={config?.profile?.photo ?? ''}
        initialName={config?.profile?.username ?? ''}
        initialProfileData={config?.profile?.profile_data ?? ''}
        updateConfig={updateConfig}
      />
    </div>
  );
}
