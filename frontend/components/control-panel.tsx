'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RunningState } from '@/types/appState'
import { PyAudioDevice } from '@/types/audioDevice'
import { Config } from '@/types/config'
import { APIError } from '@/types/error'
import { UseMutationResult } from '@tanstack/react-query'
import { ArrowLeft, ArrowUp, Dot, Ellipsis, Languages, LucideMic2, Mic, Mic2, MicOff, Speaker } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'
import { DialogTitle } from '@radix-ui/react-dialog'
import { toast } from 'sonner'

interface ControlPanelProps {
  runningState: RunningState
  audioInputDevices: PyAudioDevice[]
  audioOutputDevices: PyAudioDevice[]
  audioInputDevice: string

  // Audio control options
  enableAudioControl: boolean
  audioControlDevice: string
  audioDelay: number

  // Video control options
  enableVideoControl: boolean
  cameraDevice: number
  videoWidth: number
  videoHeight: number
  enableFaceSwap: boolean
  enableFaceEnhance: boolean

  // Callbacks
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
  audioOutputDevices,
  audioInputDevice,
  startMutation,
  stopMutation,
  updateConfig,

  // Audio control options
  enableAudioControl,
  audioControlDevice,
  audioDelay,
  // Video control options
  enableVideoControl,
  cameraDevice,
  videoWidth,
  videoHeight,
  enableFaceSwap,
  enableFaceEnhance,
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
          <Mic2 className="mr-1.5 h-3.5 w-3.5" />
          <Select value={audioInputDevice} onValueChange={(v) => updateConfig({ audio_input_device: Number(v) })}>
            <SelectTrigger className="h-8 w-32 text-xs shrink-0">
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

        {/* Audio Control Toggle + Dialog */}
        <div className={`flex items-center rounded-md overflow-hidden border ${enableAudioControl ? '' : 'bg-destructive text-white'}`}>
          <Button
            variant={enableAudioControl ? "outline" : "destructive"}
            size="icon"
            className={`h-8 w-8 border-none rounded-none ${enableAudioControl ? '' : ''}`}
            onClick={() => {
              if (enableAudioControl) {
                toast.success("Audio control disabled");
              } else {
                toast.success("Audio control enabled");
              }
              updateConfig({ enable_audio_control: !enableAudioControl });
            }}
          >
            {enableAudioControl ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant={enableAudioControl ? "outline" : "destructive"} size="icon" className="h-8 w-8 rounded-none border-none">
                <Ellipsis className="h-4 w-4" />
              </Button>
            </DialogTrigger>

            <DialogContent className="flex flex-col w-72 p-4">
              <DialogTitle>Audio Control Options</DialogTitle>

              {/* Output Device Select */}
              <div className="mb-3">
                <label className="text-xs text-muted-foreground mb-1 block">Output Device</label>
                <Select
                  value={audioControlDevice}
                  onValueChange={(v) => updateConfig({ audio_control_device: Number(v) })}
                >
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    {audioOutputDevices.map((device) => (
                      <SelectItem key={device.index} value={`${device.index}`}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Audio Delay Input */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Audio Delay (ms)</label>
                <input
                  type="number"
                  value={audioDelay}
                  onChange={(e) => updateConfig({ audio_delay: Number(e.target.value) })}
                  className="w-full h-8 px-2 text-xs border rounded-md bg-background"
                  min={0}
                  step={10}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Language Select */}
        <div className='flex items-center'>
          <Languages className="mr-1.5 h-3.5 w-3.5" />
          <Select value="en">
            <SelectTrigger className="h-8 w-28 text-xs shrink-0">
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
          className={`shrink-0 h-8 px-3 text-xs font-medium ${className}`
          }
          disabled={disabled}
        >
          {icon}
          {label}
        </Button >
      </div >

      {/* Status indicator */}
      < div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50" >
        <div className={`h-2 w-2 rounded-full ${indicatorDotClass}`} />
        <span className="text-xs text-muted-foreground">{indicatorLabel}</span>
      </div >
    </div >
  )
}
