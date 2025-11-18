'use client'

import { useState } from 'react'
import VideoPanel from '@/components/video-panel'
import TranscriptPanel from '@/components/transcript-panel'
import SuggestionsPanel from '@/components/suggestions-panel'
import ControlPanel from '@/components/control-panel'
import ProfileDialog from '@/components/profile-dialog'
import TopBar from '@/components/top-bar'

export default function Home() {
  const [isRecording, setIsRecording] = useState(false)
  const [selectedMicrophone, setSelectedMicrophone] = useState('default')
  const [selectedOutput, setSelectedOutput] = useState('default')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userName, setUserName] = useState('John Doe')
  const [isDark, setIsDark] = useState(false)

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
        <div className="flex flex-col gap-2 w-80 flex-shrink-0 min-h-0">
          {/* Video Panel - Small and compact */}
          <div className="h-48 flex-shrink-0">
            <VideoPanel />
          </div>

          {/* Transcription Panel - Fill remaining space with scroll */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <TranscriptPanel />
          </div>
        </div>

        {/* Center Column: Main Suggestions Panel */}
        <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
          <SuggestionsPanel />
        </div>
      </div>

      <div className="border-t border-border bg-card shadow-lg">
        <ControlPanel
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          selectedMicrophone={selectedMicrophone}
          setSelectedMicrophone={setSelectedMicrophone}
          selectedOutput={selectedOutput}
          setSelectedOutput={setSelectedOutput}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
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
