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
import { ArrowLeft, ArrowUp, Camera, CameraOff, Dot, Ellipsis, Languages, LucideMic2, Mic, Mic2, MicOff, Speaker, Video, VideoOff } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'
import { DialogTitle } from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { useEffect, useRef, useState } from 'react'
import { useVideoDevices } from '@/hooks/useVideoDevices'

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
  cameraDevice: string
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

  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const previewStreamRef = useRef<MediaStream | null>(null)
  const videoDevices = useVideoDevices();

  useEffect(() => {
    // Only run when dialog is open and video control enabled
    if (!isVideoDialogOpen || !enableVideoControl) return
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Media devices API unavailable")
      return
    }

    const startPreview = async () => {
      // Stop previous stream before starting a new one
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach(t => t.stop())
        previewStreamRef.current = null
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: cameraDevice ? { exact: cameraDevice } : undefined,
          width: videoWidth,
          height: videoHeight,
        },
        audio: false,
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        previewStreamRef.current = stream
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream
          // Some browsers need play() after setting srcObject
          await videoPreviewRef.current.play().catch(() => { })
        }
      } catch (err) {
        toast.error("Unable to access camera")
      }
    }

    startPreview()

    // Cleanup when dialog closes or dependencies change
    return () => {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach(t => t.stop())
        previewStreamRef.current = null
      }
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null
      }
    }
  }, [isVideoDialogOpen, enableVideoControl, cameraDevice, videoWidth, videoHeight])

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
        <div className={`flex items-center rounded-xl overflow-hidden border ${enableAudioControl ? '' : 'bg-destructive text-white'}`}>
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

        {/* Video Control Toggle + Dialog */}
        <div className={`flex items-center rounded-xl overflow-hidden border ${enableVideoControl ? '' : 'bg-destructive text-white'}`}>
          <Button
            variant={enableVideoControl ? "outline" : "destructive"}
            size="icon"
            className="h-8 w-8 border-none rounded-none"
            onClick={() => {
              toast.success(enableVideoControl ? "Video control disabled" : "Video control enabled")
              updateConfig({ enable_video_control: !enableVideoControl })
            }}
          >
            {enableVideoControl ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>

          <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
            <DialogTrigger asChild>
              <Button variant={enableVideoControl ? "outline" : "destructive"} size="icon" className="h-8 w-8 rounded-none border-none">
                <Ellipsis className="h-4 w-4" />
              </Button>
            </DialogTrigger>

            <DialogContent className="flex flex-col w-72 p-4 gap-4">
              <DialogTitle>Video Control Options</DialogTitle>

              {/* Camera Preview */}
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                className="w-full h-32 bg-black rounded-md object-contain"
              />

              {/* Camera Device Select */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Camera Device</label>
                <Select
                  value={`${cameraDevice}`}
                  onValueChange={(v) => updateConfig({ camera_device: v })}
                >
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {videoDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={`${device.deviceId}`}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution Select */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Resolution</label>
                <Select
                  value={`${videoWidth}x${videoHeight}`}
                  onValueChange={(v) => {
                    const [w, h] = v.split('x').map(Number)
                    updateConfig({ video_width: w, video_height: h })
                  }}
                >
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    {['640x480', '1280x720', '1920x1080'].map(res => (
                      <SelectItem key={res} value={res}>{res}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Face Swap Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs">Face Swap</span>
                <Button
                  variant={enableFaceSwap ? "default" : "outline"}
                  size="sm"
                  className='w-16'
                  onClick={() => updateConfig({ enable_face_swap: !enableFaceSwap })}
                >
                  {enableFaceSwap ? "On" : "Off"}
                </Button>
              </div>

              {/* Face Enhance Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs">Face Enhance</span>
                <Button
                  variant={enableFaceEnhance ? "default" : "outline"}
                  size="sm"
                  className='w-16'
                  onClick={() => updateConfig({ enable_face_enhance: !enableFaceEnhance })}
                >
                  {enableFaceEnhance ? "On" : "Off"}
                </Button>
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
