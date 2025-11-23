'use client'

import ControlPanel from '@/components/control-panel'
import ProfileDialog from '@/components/profile-dialog'
import SuggestionsPanel from '@/components/suggestions-panel'
import TopBar from '@/components/top-bar'
import TranscriptPanel from '@/components/transcript-panel'
import VideoPanel from '@/components/video-panel'
import axiosClient from '@/lib/axiosClient'
import { AppState, RunningState } from '@/types/appState'
import { PyAudioDevice } from '@/types/audioDevice'
import { Config } from '@/types/config'
import { APIError } from '@/types/error'
import { SuggestionState } from '@/types/suggestion'
import { Transcript } from '@/types/transcript'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export default function Home() {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [config, setConfig] = useState<Config>()
  const [transcripts, setTranscripts] = useState<Transcript[]>([])

  const { data: configFetched } = useQuery<Config, APIError>({
    queryKey: ['config'],
    queryFn: async () => {
      const response = await axiosClient.get<Config>('/api/config/get');
      return response.data;
    },
  })
  const updateConfigMutation = useMutation<Config, APIError, Partial<Config>>({
    mutationFn: async (config) => {
      const response = await axiosClient.put('/api/config/update', config);
      return response.data;
    },
  })

  const { data: audioInputDevices } = useQuery<PyAudioDevice[], APIError>({
    queryKey: ['audioInputDevices'],
    queryFn: async () => {
      const response = await axiosClient.get<PyAudioDevice[]>('/api/app/audio-input-devices');
      return response.data;
    },
    refetchInterval: 1000,
  })

  const { data: audioOutputDevices } = useQuery<PyAudioDevice[], APIError>({
    queryKey: ['audioOutputDevices'],
    queryFn: async () => {
      const response = await axiosClient.get<PyAudioDevice[]>('/api/app/audio-output-devices');
      return response.data;
    },
    refetchInterval: 1000,
  })

  const { data: appState } = useQuery<AppState, APIError>({
    queryKey: ['appState'],
    queryFn: async () => {
      const response = await axiosClient.get<AppState>('/api/app/get-state');
      return response.data;
    },
    refetchInterval: 50,
  })
  const startMutation = useMutation<void, APIError, void>({
    mutationFn: async () => {
      const response = await axiosClient.get('/api/app/start');
      return response.data;
    },
  })
  const stopMutation = useMutation<void, APIError, void>({
    mutationFn: async () => {
      const response = await axiosClient.get('/api/app/stop');
      return response.data;
    },
  })

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
    const newConfig = { ...config, ...cfg } as Config
    setConfig(newConfig)
    updateConfigMutation.mutate(cfg)
  }

  useEffect(() => {
    if (configFetched) {
      setConfig(configFetched);
    }
  }, [configFetched])
  useEffect(() => {
    if (appState?.transcripts && appState?.transcripts !== transcripts) {
      setTranscripts(appState?.transcripts)
    }
  }, [appState?.transcripts])
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
        userName={config?.profile?.username || ''}
        onProfileClick={() => setIsProfileOpen(true)}
        onThemeToggle={handleThemeToggle}
        isDark={isDark}
      />

      <div className="flex flex-1 overflow-y-hidden gap-2 py-2" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Left Column: Video + Transcription */}
        <div className="flex flex-col gap-2 w-96 shrink-0 min-h-0">
          {/* Video Panel - Small and compact */}
          <div className="h-48 shrink-0">
            <VideoPanel />
          </div>

          {/* Transcription Panel - Fill remaining space with scroll */}
          <div className="flex-1 min-h-0 rounded-lg overflow-hidden">
            <TranscriptPanel
              transcripts={transcripts ?? []}
            />
          </div>
        </div>

        {/* Center Column: Main Suggestions Panel */}
        <div className="flex-1 min-w-0 min-h-0 rounded-lg">
          <SuggestionsPanel
            suggestions={appState?.suggestions}
          />
        </div>
      </div>

      <div className="border border-border rounded-lg bg-card">
        <ControlPanel
          runningState={appState?.running_state ?? RunningState.IDLE}
          startMutation={startMutation}
          stopMutation={stopMutation}
          audioInputDevices={audioInputDevices ?? []}
          audioOutputDevices={audioOutputDevices ?? []}
          audioInputDevice={`${config?.audio_input_device ?? 0}`}
          updateConfig={updateConfig}
          // Audio control options
          enableAudioControl={config?.enable_audio_control ?? false}
          audioControlDevice={`${config?.audio_control_device ?? 0}`}
          audioDelay={config?.audio_delay ?? 0}
          // Video control options
          enableVideoControl={config?.enable_video_control ?? false}
          cameraDevice={config?.camera_device ?? 0}
          videoWidth={config?.video_width ?? 1280}
          videoHeight={config?.video_height ?? 720}
          enableFaceSwap={config?.enable_face_swap ?? false}
          enableFaceEnhance={config?.enable_face_enhance ?? false}
        />
      </div>

      <ProfileDialog
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        initialName={config?.profile?.username ?? ""}
        initialProfileData={config?.profile?.profile_data ?? ""}
        updateConfig={updateConfig}
      />
    </div>
  )
}
