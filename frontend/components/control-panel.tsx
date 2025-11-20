'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppState, RunningState } from '@/types/appState'
import { PyAudioDevice } from '@/types/audioDevice'
import { Config } from '@/types/config'
import { APIError } from '@/types/error'
import { UseMutationResult } from '@tanstack/react-query'
import { Languages, Mic, MicOff, Speaker } from 'lucide-react'

interface ControlPanelProps {
  runningState: RunningState
  audioInputDevices: PyAudioDevice[]
  audioOutputDevices: PyAudioDevice[]
  selectedInputDevice: string
  selectedOutputDevice: string
  startMutation: UseMutationResult<void, APIError, void, unknown>
  stopMutation: UseMutationResult<void, APIError, void, unknown>
  updateConfig: (config: Partial<Config>) => void
}

type StateConfig = {
  onClick: () => void;
  className: string;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
};

type IndicatorConfig = {
  dotClass: string;
  label: string;
};


export default function ControlPanel({
  runningState,
  audioInputDevices,
  selectedInputDevice,
  audioOutputDevices,
  selectedOutputDevice,
  startMutation,
  stopMutation,
  updateConfig,
}: ControlPanelProps) {

  const stateConfig: Record<RunningState, StateConfig> = {
    [RunningState.IDLE]: {
      onClick: () => startMutation.mutate(),
      className: "bg-primary hover:bg-primary/90",
      disabled: false,
      icon: <Mic className="mr-1.5 h-3.5 w-3.5" />,
      label: "Start",
    },
    [RunningState.STARTING]: {
      onClick: () => { },
      className: "bg-primary hover:bg-primary/90",
      disabled: true,
      icon: <Mic className="mr-1.5 h-3.5 w-3.5" />,
      label: "Starting...",
    },
    [RunningState.RUNNING]: {
      onClick: () => stopMutation.mutate(),
      className: "bg-destructive hover:bg-destructive/90",
      disabled: false,
      icon: <MicOff className="mr-1.5 h-3.5 w-3.5" />,
      label: "Stop",
    },
    [RunningState.STOPPING]: {
      onClick: () => { },
      className: "bg-destructive hover:bg-destructive/90",
      disabled: true,
      icon: <MicOff className="mr-1.5 h-3.5 w-3.5" />,
      label: "Stopping...",
    },
    [RunningState.STOPPED]: {
      onClick: () => startMutation.mutate(),
      className: "bg-primary hover:bg-primary/90",
      disabled: false,
      icon: <Mic className="mr-1.5 h-3.5 w-3.5" />,
      label: "Start",
    },
  };
  const { onClick, className, disabled, icon, label } = stateConfig[runningState];

  const indicatorConfig: Record<RunningState, IndicatorConfig> = {
    [RunningState.IDLE]: {
      dotClass: "bg-muted-foreground",
      label: "Idle",
    },
    [RunningState.STARTING]: {
      dotClass: "bg-primary animate-pulse",
      label: "Starting",
    },
    [RunningState.RUNNING]: {
      dotClass: "bg-destructive animate-pulse",
      label: "Running",
    },
    [RunningState.STOPPING]: {
      dotClass: "bg-destructive animate-pulse",
      label: "Stopping",
    },
    [RunningState.STOPPED]: {
      dotClass: "bg-muted-foreground",
      label: "Stopped",
    },
  };
  const { dotClass: indicatorDotClass, label: indicatorLabel } = indicatorConfig[runningState];

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className='flex flex-1 justify-center gap-4 items-center'>

        {/* Microphone Select */}
        <div className='flex items-center'>
          <Mic className="mr-1.5 h-3.5 w-3.5" />
          <Select value={selectedInputDevice} onValueChange={(v) => updateConfig({ audio_input_device: Number(v) })}>
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
        </div>

        {/* Output Audio Select */}
        <div className='flex items-center'>
          <Speaker className="mr-1.5 h-3.5 w-3.5" />
          <Select value={selectedOutputDevice} onValueChange={(v) => updateConfig({ audio_output_device: Number(v) })}>
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
        </div>

        {/* Language Select */}
        <div className='flex items-center'>
          <Languages className="mr-1.5 h-3.5 w-3.5" />
          <Select value="en">
            <SelectTrigger className="h-8 w-28 text-xs flex-shrink-0">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Start/Stop Button */}
        <Button
          onClick={onClick}
          size="sm"
          className={`flex-shrink-0 h-8 px-3 text-xs font-medium ${className}`}
          disabled={disabled}
        >
          {icon}
          {label}
        </Button>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50">
        <div className={`h-2 w-2 rounded-full ${indicatorDotClass}`} />
        <span className="text-xs text-muted-foreground">{indicatorLabel}</span>
      </div>
    </div>
  )
}
