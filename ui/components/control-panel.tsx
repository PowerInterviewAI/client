'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVideoDevices } from '@/hooks/useVideoDevices';
import { RunningState } from '@/types/appState';
import { PyAudioDevice } from '@/types/audioDevice';
import { Config } from '@/types/config';
import { APIError } from '@/types/error';
import { DialogTitle } from '@radix-ui/react-dialog';
import { UseMutationResult } from '@tanstack/react-query';
import { Ellipsis, Mic, Mic2, MicOff, Play, Square, Video, VideoOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';

interface ControlPanelProps {
  runningState: RunningState;
  audioInputDevices: PyAudioDevice[];
  audioOutputDevices: PyAudioDevice[];

  // Transcription options
  audioInputDevice: string;
  asrModel: string;

  // Audio control options
  enableAudioControl: boolean;
  audioControlDevice: string;
  audioDelay: number;

  // Video control options
  enableVideoControl: boolean;
  cameraDevice: string;
  videoWidth: number;
  videoHeight: number;
  enableFaceSwap: boolean;
  enableFaceEnhance: boolean;

  // Callbacks
  startMutation: UseMutationResult<void, APIError, void, unknown>;
  stopMutation: UseMutationResult<void, APIError, void, unknown>;
  updateConfig: (config: Partial<Config>) => void;
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
  startMutation,
  stopMutation,
  updateConfig,

  // Transcription options
  audioInputDevice,
  asrModel,

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
      className: 'bg-primary hover:bg-primary/90',
      disabled: false,
      icon: <Play className="h-3.5 w-3.5" />,
      label: 'Start',
    },
    [RunningState.STARTING]: {
      onClick: () => { },
      className: 'bg-primary hover:bg-primary/90',
      disabled: true,
      icon: <Ellipsis className="h-3.5 w-3.5 animate-pulse" />,
      label: 'Starting...',
    },
    [RunningState.RUNNING]: {
      onClick: () => stopMutation.mutate(),
      className: 'bg-destructive hover:bg-destructive/90',
      disabled: false,
      icon: <Square className="h-3.5 w-3.5" />,
      label: 'Stop',
    },
    [RunningState.STOPPING]: {
      onClick: () => { },
      className: 'bg-destructive hover:bg-destructive/90',
      disabled: true,
      icon: <Ellipsis className="h-3.5 w-3.5 animate-pulse" />,
      label: 'Stopping...',
    },
    [RunningState.STOPPED]: {
      onClick: () => startMutation.mutate(),
      className: 'bg-primary hover:bg-primary/90',
      disabled: false,
      icon: <Play className="h-3.5 w-3.5" />,
      label: 'Start',
    },
  };
  const { onClick, className, disabled, icon, label } = stateConfig[runningState];

  const indicatorConfig: Record<RunningState, IndicatorConfig> = {
    [RunningState.IDLE]: {
      dotClass: 'bg-muted-foreground',
      label: 'Idle',
    },
    [RunningState.STARTING]: {
      dotClass: 'bg-primary animate-pulse',
      label: 'Starting',
    },
    [RunningState.RUNNING]: {
      dotClass: 'bg-destructive animate-pulse',
      label: 'Running',
    },
    [RunningState.STOPPING]: {
      dotClass: 'bg-destructive animate-pulse',
      label: 'Stopping',
    },
    [RunningState.STOPPED]: {
      dotClass: 'bg-muted-foreground',
      label: 'Stopped',
    },
  };
  const { dotClass: indicatorDotClass, label: indicatorLabel } = indicatorConfig[runningState];

  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const videoDevices = useVideoDevices();

  useEffect(() => {
    // Only run when dialog is open
    if (!isVideoDialogOpen) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Media devices API unavailable');
      return;
    }

    const startPreview = async () => {
      // Stop previous stream before starting a new one
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop());
        previewStreamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: cameraDevice ? { exact: cameraDevice } : undefined,
          width: videoWidth,
          height: videoHeight,
        },
        audio: false,
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        previewStreamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          // Some browsers need play() after setting srcObject
          await videoPreviewRef.current.play().catch(() => { });
        }
      } catch (err) {
        toast.error('Unable to access camera');
        console.error(err);
      }
    };

    startPreview();

    // Cleanup when dialog closes or dependencies change
    return () => {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop());
        previewStreamRef.current = null;
      }
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
    };
  }, [isVideoDialogOpen, enableVideoControl, cameraDevice, videoWidth, videoHeight]);

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2">
      <div className="flex flex-1 justify-center gap-2 items-center">
        {/* Transcription + Dialog */}
        <div className="flex items-center rounded-full overflow-hidden border">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className="h-8 w-8 border-none rounded-none"
                title="Transcription options"
              >
                <Mic2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>

            <DialogContent className="flex flex-col w-72 p-4">
              <DialogTitle>Transcription Options</DialogTitle>

              {/* Microphone Select */}
              <div className="mb-3">
                <label className="text-xs text-muted-foreground mb-1 block">Microphone</label>
                <Select
                  value={audioInputDevice}
                  onValueChange={(v) => updateConfig({ audio_input_device: Number(v) })}
                >
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Select microphone" />
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
              {/* ASR Model Select */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">ASR Model</label>
                <Select value={asrModel} onValueChange={(v) => updateConfig({ asr_model: v })}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Select ASR model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vosk-model-en-us-0.22-lgraph">
                      vosk-model-en-us-0.22-lgraph
                    </SelectItem>
                    <SelectItem value="vosk-model-en-us-0.42-gigaspeech">
                      vosk-model-en-us-0.42-gigaspeech
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Audio Control Toggle + Dialog */}
        <div
          className={`flex items-center rounded-full overflow-hidden border ${enableAudioControl ? '' : 'bg-destructive text-white'}`}
        >
          <Button
            variant={enableAudioControl ? 'outline' : 'destructive'}
            size="icon"
            className={`h-8 w-8 border-none rounded-none ${enableAudioControl ? '' : ''}`}
            title="Toggle audio control"
            onClick={() => {
              if (enableAudioControl) {
                toast.success('Audio control disabled');
              } else {
                toast.success('Audio control enabled');
              }
              updateConfig({ enable_audio_control: !enableAudioControl });
            }}
          >
            {enableAudioControl ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant={enableAudioControl ? 'outline' : 'destructive'}
                size="icon"
                className="h-8 w-8 rounded-none border-none"
                title="Audio control options"
              >
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
                  onChange={(e) => updateConfig({ audio_delay_ms: Number(e.target.value) })}
                  className="w-full h-8 px-2 text-xs border rounded-md bg-background"
                  min={0}
                  step={10}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Video Control Toggle + Dialog */}
        <div
          className={`flex items-center rounded-full overflow-hidden border ${enableVideoControl ? '' : 'bg-destructive text-white'}`}
        >
          <Button
            variant={enableVideoControl ? 'outline' : 'destructive'}
            size="icon"
            className="h-8 w-8 border-none rounded-none"
            title="Toggle video control"
            onClick={() => {
              toast.success(
                enableVideoControl ? 'Video control disabled' : 'Video control enabled',
              );
              updateConfig({ enable_video_control: !enableVideoControl });
            }}
          >
            {enableVideoControl ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          </Button>

          <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant={enableVideoControl ? 'outline' : 'destructive'}
                size="icon"
                className="h-8 w-8 rounded-none border-none"
                title="Video control options"
              >
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
                    const [w, h] = v.split('x').map(Number);
                    updateConfig({ video_width: w, video_height: h });
                  }}
                >
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    {['640x360', '640x480', '1280x720', '1920x1080'].map((res) => (
                      <SelectItem key={res} value={res}>
                        {res}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Face Swap Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs">Face Swap</span>
                <Button
                  variant={enableFaceSwap ? 'default' : 'outline'}
                  size="sm"
                  className="w-16"
                  onClick={() => updateConfig({ enable_face_swap: !enableFaceSwap })}
                >
                  {enableFaceSwap ? 'On' : 'Off'}
                </Button>
              </div>

              {/* Face Enhance Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs">Face Enhance</span>
                <Button
                  variant={enableFaceEnhance ? 'default' : 'outline'}
                  size="sm"
                  className="w-16"
                  onClick={() => updateConfig({ enable_face_enhance: !enableFaceEnhance })}
                >
                  {enableFaceEnhance ? 'On' : 'Off'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Start/Stop Button */}
        <Button
          onClick={onClick}
          size="sm"
          className={`h-10 w-16 text-xs  font-medium rounded-full cursor-pointer ${className}`}
          disabled={disabled}
          title="Start/Stop Assistant"
        >
          {icon}
          <span hidden>{label}</span>
        </Button>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 px-2 py-1 w-24 rounded-md bg-muted/50">
        <div className={`h-2 w-2 rounded-full ${indicatorDotClass}`} />
        <span className="text-xs text-muted-foreground">{indicatorLabel}</span>
      </div>
    </div>
  );
}
