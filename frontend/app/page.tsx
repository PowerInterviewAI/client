'use client'

import ControlPanel from '@/components/control-panel'
import ProfileDialog from '@/components/profile-dialog'
import SuggestionsPanel from '@/components/suggestions-panel'
import TopBar from '@/components/top-bar'
import TranscriptPanel from '@/components/transcript-panel'
import VideoPanel from '@/components/video-panel'
import axiosClient from '@/lib/axiosClient'
import { AppState } from '@/types/appState'
import { PyAudioDevice } from '@/types/audioDevice'
import { APIError } from '@/types/error'
import { RunningState } from '@/types/runningState'
import { Transcript } from '@/types/transcript'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export default function Home() {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userName, setUserName] = useState('John Doe')
  const [isDark, setIsDark] = useState(false)
  const [appState, setAppState] = useState<AppState>()
  const [transcripts, setTranscripts] = useState<Transcript[]>([])

  const { data: appStateFetched } = useQuery<AppState, APIError>({
    queryKey: ['appState'],
    queryFn: async () => {
      const response = await axiosClient.get<AppState>('/api/app-state/get-app-state');
      return response.data;
    },
  })
  const updateAppStateMutation = useMutation<AppState, APIError, Partial<AppState>>({
    mutationFn: async (appState) => {
      const response = await axiosClient.put('/api/app-state/update-app-state', appState);
      return response.data;
    },
  })
  const { data: audioInputDevices } = useQuery<PyAudioDevice[], APIError>({
    queryKey: ['audioInputDevices'],
    queryFn: async () => {
      const response = await axiosClient.get<PyAudioDevice[]>('/api/app-state/audio-input-devices');
      return response.data;
    },
  })
  const { data: audioOutputDevices } = useQuery<PyAudioDevice[], APIError>({
    queryKey: ['audioOutputDevices'],
    queryFn: async () => {
      const response = await axiosClient.get<PyAudioDevice[]>('/api/app-state/audio-output-devices');
      return response.data;
    }
  })
  const { data: transcriptsFetched } = useQuery<Transcript[], APIError>({
    queryKey: ['transcriptions'],
    queryFn: async () => {
      const response = await axiosClient.get<Transcript[]>('/api/app-state/get-transcriptions');
      return response.data;
    },
    refetchInterval: 100,
    refetchIntervalInBackground: true
  })
  const { data: runningState } = useQuery<RunningState, APIError>({
    queryKey: ['runningState'],
    queryFn: async () => {
      const response = await axiosClient.get<RunningState>('/api/app-state/running-state');
      return response.data;
    },
    refetchInterval: 100
  })
  const startMutation = useMutation<void, APIError, void>({
    mutationFn: async () => {
      const response = await axiosClient.get('/api/app-state/start');
      return response.data;
    },
  })
  const stopMutation = useMutation<void, APIError, void>({
    mutationFn: async () => {
      const response = await axiosClient.get('/api/app-state/stop');
      return response.data;
    },
  })

  const handleThemeToggle = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    if (newIsDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const updateAppState = (state: Partial<AppState>) => {
    const newState = { ...appState, ...state } as AppState
    setAppState(newState)
    updateAppStateMutation.mutate(state)
  }

  useEffect(() => {
    if (appStateFetched) {
      setAppState(appStateFetched)
    }
  }, [appStateFetched])
  useEffect(() => {
    if (transcriptsFetched && transcriptsFetched !== transcripts) {
      setTranscripts(transcriptsFetched)
    }
  }, [transcriptsFetched])

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopBar
        userName={userName}
        onProfileClick={() => setIsProfileOpen(true)}
        onThemeToggle={handleThemeToggle}
        isDark={isDark}
      />

      <div className="flex flex-1 overflow-hidden gap-2 p-2" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Left Column: Video + Transcription */}
        <div className="flex flex-col gap-2 w-96 flex-shrink-0 min-h-0">
          {/* Video Panel - Small and compact */}
          <div className="h-48 flex-shrink-0">
            <VideoPanel />
          </div>

          {/* Transcription Panel - Fill remaining space with scroll */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <TranscriptPanel
              transcripts={transcripts || []}
            />
          </div>
        </div>

        {/* Center Column: Main Suggestions Panel */}
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
          <SuggestionsPanel />
        </div>
      </div>

      <div className="border-t border-border bg-card shadow-lg">
        <ControlPanel
          runningState={runningState ?? RunningState.IDLE}
          startMutation={startMutation}
          stopMutation={stopMutation}
          audioInputDevices={audioInputDevices || []}
          selectedInputDevice={`${appState?.audio_input_device}`}
          audioOutputDevices={audioOutputDevices || []}
          selectedOutputDevice={`${appState?.audio_output_device}`}
          updateState={updateAppState}
        />
      </div>

      <ProfileDialog
        isOpen={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        onNameChange={setUserName}
        initialName={userName}
      />
    </div>
  )
}
