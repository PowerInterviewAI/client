'use client';

import ControlPanel from '@/components/control-panel';
import ProfileDialog from '@/components/profile-dialog';
import SuggestionsPanel from '@/components/suggestions-panel';
import TranscriptPanel from '@/components/transcript-panel';
import { VideoPanel, VideoPanelHandle } from '@/components/video-panel';
import { useAppState } from '@/hooks/app-state';
import { useStartAssistant, useStopAssistant } from '@/hooks/assistant';
import { useAudioInputDevices, useAudioOutputDevices } from '@/hooks/audio-devices';
import { useConfigQuery, useUpdateConfig } from '@/hooks/config';
import { RunningState } from '@/types/appState';
import { Config } from '@/types/config';
import { Transcript } from '@/types/transcript';
import { Loader } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [config, setConfig] = useState<Config>();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const videoPanelRef = useRef<VideoPanelHandle>(null);

  // Queries
  const { data: configFetched } = useConfigQuery();
  const { data: audioInputDevices } = useAudioInputDevices(1000);
  const { data: audioOutputDevices } = useAudioOutputDevices(1000);
  const { data: appState, error: appStateError } = useAppState(50);

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

  return appState?.is_backend_live && appState?.is_gpu_server_live ? (
    <div className="h-screen w-full bg-background p-1 space-y-1">
      <div className="flex flex-1 overflow-y-hidden gap-1" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Left Column: Video + Transcription */}
        <div className="flex flex-col gap-2 w-1/2 md:w-96 shrink-0 min-h-0">
          {/* Video Panel - Small and compact */}
          <div className="h-48 shrink-0" hidden={!config?.enable_video_control}>
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
              enableFaceSwap={config?.enable_face_swap ?? false}
              enableFaceEnhance={config?.enable_face_enhance ?? false}
            />
          </div>

          {/* Transcription Panel - Fill remaining space with scroll */}
          <div className="flex-1 min-h-0 rounded-lg overflow-hidden">
            <TranscriptPanel
              username={config?.profile?.username ?? ''}
              transcripts={transcripts ?? []}
            />
          </div>
        </div>

        {/* Right Column: Main Suggestions Panel */}
        <div className="w-1/2 md:flex-1 min-w-60 min-h-0 rounded-lg">
          <SuggestionsPanel suggestions={appState?.suggestions} />
        </div>
      </div>

      <div className="border border-border rounded-lg bg-card">
        <ControlPanel
          runningState={appState?.assistant_state ?? RunningState.IDLE}
          startMutation={startMutation}
          stopMutation={stopMutation}
          audioInputDevices={audioInputDevices ?? []}
          audioOutputDevices={audioOutputDevices ?? []}
          onProfileClick={() => setIsProfileOpen(true)}
          onThemeToggle={handleThemeToggle}
          isDark={isDark}
          config={config}
          updateConfig={updateConfig}
        />
      </div>

      <ProfileDialog
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        initialPhoto={config?.profile?.photo ?? ''}
        initialName={config?.profile?.username ?? ''}
        initialProfileData={config?.profile?.profile_data ?? ''}
        updateConfig={updateConfig}
      />
    </div>
  ) : (
    <div className="flex justify-center items-center h-screen w-full bg-background ">
      <div className="flex flex-col items-center">
        <div className="flex gap-2 items-center">
          <Image src="/logo.svg" alt="Logo" width={32} height={32} className="mx-auto" />
          <p className="text-2xl font-bold">Power Interview</p>
        </div>
        <p className="animate-pulse text-sm mt-4">Allocating cloud resources…</p>
        <Loader className="w-4 h-4 animate-spin" />
      </div>
    </div>
  );
}
