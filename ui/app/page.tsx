'use client';

import ControlPanel from '@/components/control-panel';
import ProfileDialog from '@/components/profile-dialog';
import SuggestionsPanel from '@/components/suggestions-panel';
import TopBar from '@/components/top-bar';
import TranscriptPanel from '@/components/transcript-panel';
import { VideoPanel, VideoPanelHandle } from '@/components/video-panel';
import axiosClient from '@/lib/axiosClient';
import { AppState, RunningState } from '@/types/appState';
import { PyAudioDevice } from '@/types/audioDevice';
import { Config } from '@/types/config';
import { APIError } from '@/types/error';
import { Transcript } from '@/types/transcript';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [config, setConfig] = useState<Config>();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const videoPanelRef = useRef<VideoPanelHandle>(null);

  const { data: configFetched } = useQuery<Config, APIError>({
    queryKey: ['config'],
    queryFn: async () => {
      const response = await axiosClient.get<Config>('/api/app/get-config');
      return response.data;
    },
  });
  const updateConfigMutation = useMutation<Config, APIError, Partial<Config>>({
    mutationFn: async (config) => {
      const response = await axiosClient.put('/api/app/update-config', config);
      return response.data;
    },
  });

  const { data: audioInputDevices } = useQuery<PyAudioDevice[], APIError>({
    queryKey: ['audioInputDevices'],
    queryFn: async () => {
      const response = await axiosClient.get<PyAudioDevice[]>('/api/app/audio-input-devices');
      return response.data;
    },
    refetchInterval: 1000,
  });

  const { data: audioOutputDevices } = useQuery<PyAudioDevice[], APIError>({
    queryKey: ['audioOutputDevices'],
    queryFn: async () => {
      const response = await axiosClient.get<PyAudioDevice[]>('/api/app/audio-output-devices');
      return response.data;
    },
    refetchInterval: 1000,
  });

  const { data: appState } = useQuery<AppState, APIError>({
    queryKey: ['appState'],
    queryFn: async () => {
      const response = await axiosClient.get<AppState>('/api/app/get-state');
      return response.data;
    },
    refetchInterval: 50,
  });
  const startMutation = useMutation<void, APIError, void>({
    mutationFn: async () => {
      axiosClient.get('/api/app/start-assistant');
      if (config?.enable_video_control) {
        await videoPanelRef.current?.startWebRTC();
      }
    },
  });
  const stopMutation = useMutation<void, APIError, void>({
    mutationFn: async () => {
      await axiosClient.get('/api/app/stop-assistant');
      videoPanelRef.current?.stopWebRTC();
    },
  });

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

  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto bg-background p-2">
      <TopBar
        photo={config?.profile?.photo ?? ''}
        userName={config?.profile?.username ?? ''}
        onProfileClick={() => setIsProfileOpen(true)}
        onThemeToggle={handleThemeToggle}
        isDark={isDark}
      />

      <div
        className="flex flex-1 overflow-y-hidden gap-2 py-2"
        style={{ height: 'calc(100vh - 120px)' }}
      >
        {/* Left Column: Video + Transcription */}
        <div className="flex flex-col gap-2 w-96 shrink-0 min-h-0">
          {/* Video Panel - Small and compact */}
          <div className="h-48 shrink-0">
            <VideoPanel
              ref={videoPanelRef}
              runningState={appState?.assistant_state ?? RunningState.IDLE}
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

        {/* Center Column: Main Suggestions Panel */}
        <div className="flex-1 min-w-0 min-h-0 rounded-lg">
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
          updateConfig={updateConfig}
          // Transcription options
          asrModelName={config?.asr_model_name ?? ''}
          audioInputDeviceName={`${config?.audio_input_device_name ?? 0}`}
          // Audio control options
          enableAudioControl={config?.enable_audio_control ?? false}
          audioControlDeviceName={`${config?.audio_control_device_name ?? 0}`}
          audioDelay={config?.audio_delay_ms ?? 0}
          // Video control options
          enableVideoControl={config?.enable_video_control ?? false}
          cameraDeviceName={config?.camera_device_name ?? ''}
          videoWidth={config?.video_width ?? 1280}
          videoHeight={config?.video_height ?? 720}
          enableFaceSwap={config?.enable_face_swap ?? false}
          enableFaceEnhance={config?.enable_face_enhance ?? false}
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
  );
}
