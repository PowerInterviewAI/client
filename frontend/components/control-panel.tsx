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

interface ControlPanelProps {
  isRecording: boolean
  setIsRecording: (value: boolean) => void
  selectedMicrophone: string
  setSelectedMicrophone: (value: string) => void
  selectedOutput: string
  setSelectedOutput: (value: string) => void
  selectedLanguage: string
  setSelectedLanguage: (value: string) => void
}

export default function ControlPanel({
  isRecording,
  setIsRecording,
  selectedMicrophone,
  setSelectedMicrophone,
  selectedOutput,
  setSelectedOutput,
  selectedLanguage,
  setSelectedLanguage,
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
      <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
        <SelectTrigger className="h-8 w-32 text-xs flex-shrink-0">
          <SelectValue placeholder="Microphone" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default Mic</SelectItem>
          <SelectItem value="usb">USB Microphone</SelectItem>
          <SelectItem value="headset">Headset</SelectItem>
        </SelectContent>
      </Select>

      {/* Output Audio Select */}
      <Select value={selectedOutput} onValueChange={setSelectedOutput}>
        <SelectTrigger className="h-8 w-32 text-xs flex-shrink-0">
          <SelectValue placeholder="Output" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default Output</SelectItem>
          <SelectItem value="speakers">Speakers</SelectItem>
          <SelectItem value="headphones">Headphones</SelectItem>
        </SelectContent>
      </Select>

      {/* Language Select */}
      <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
        <SelectTrigger className="h-8 w-28 text-xs flex-shrink-0">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="es">Spanish</SelectItem>
          <SelectItem value="fr">French</SelectItem>
          <SelectItem value="de">German</SelectItem>
          <SelectItem value="zh">Chinese</SelectItem>
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
