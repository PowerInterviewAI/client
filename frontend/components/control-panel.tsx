'use client'

import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PyAudioDevice } from '@/types/audioDevice'
import { AppState } from '@/types/appState'

interface ControlPanelProps {
  isRecording: boolean
  setIsRecording: (value: boolean) => void
  audioInputDevices: PyAudioDevice[]
  audioOutputDevices: PyAudioDevice[]
  selectedInputDevice: string
  selectedOutputDevice: string
  selectedLanguage: string
  updateState: (state: Partial<AppState>) => void
}

export default function ControlPanel({
  isRecording,
  setIsRecording,
  audioInputDevices,
  selectedInputDevice,
  audioOutputDevices,
  selectedOutputDevice,
  selectedLanguage,
  updateState,
}: ControlPanelProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      {/* Start/Stop Button */}
      <Button
        onClick={() => setIsRecording(!isRecording)}
        size="sm"
        className={`flex-shrink-0 h-8 px-3 text-xs font-medium ${isRecording ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
          }`}
      >
        {isRecording ? (
          <>
            <MicOff className="mr-1.5 h-3.5 w-3.5" />
            Stop
          </>
        ) : (
          <>
            <Mic className="mr-1.5 h-3.5 w-3.5" />
            Start
          </>
        )}
      </Button>

      {/* Divider */}
      <div className="h-4 w-px bg-border" />

      {/* Microphone Select */}
      <Select value={selectedInputDevice} onValueChange={(v) => updateState({ audio_input_device: Number(v) })}>
        <SelectTrigger className="h-8 w-32 text-xs flex-shrink-0">
          <SelectValue placeholder="Microphone" />
        </SelectTrigger>
        <SelectContent>
          {audioInputDevices.map((device) => (
            <SelectItem key={device.index} value={`${device.index}`}>
              {device.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Output Audio Select */}
      <Select value={selectedOutputDevice} onValueChange={(v) => updateState({ audio_output_device: Number(v) })}>
        <SelectTrigger className="h-8 w-32 text-xs flex-shrink-0">
          <SelectValue placeholder="Output" />
        </SelectTrigger>
        <SelectContent>
          {
            audioOutputDevices.map((device) => (
              <SelectItem key={device.index} value={`${device.index}`}>
                {device.name}
              </SelectItem>
            ))
          }
        </SelectContent>
      </Select>

      {/* Language Select */}
      <Select value={selectedLanguage}>
        <SelectTrigger className="h-8 w-28 text-xs flex-shrink-0">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
        </SelectContent>
      </Select>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status indicator */}
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
        <div className={`h-2 w-2 rounded-full ${isRecording ? 'bg-destructive animate-pulse' : 'bg-muted-foreground'}`} />
        <span className="text-xs text-muted-foreground">{isRecording ? 'Recording' : 'Ready'}</span>
      </div>
    </div>
  )
}
