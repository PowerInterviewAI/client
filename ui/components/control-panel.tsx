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
import axiosClient from '@/lib/axiosClient';
import { RunningState } from '@/types/appState';
import { PyAudioDevice } from '@/types/audioDevice';
import { Config, UserProfile } from '@/types/config';
import { APIError } from '@/types/error';
import { DialogTitle } from '@radix-ui/react-dialog';
import { UseMutationResult } from '@tanstack/react-query';
import {
  Download,
  Ellipsis,
  Loader,
  MessageSquareText,
  Mic,
  MicOff,
  Play,
  Square,
  Video,
  VideoOff,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface ControlPanelProps {
  profile?: UserProfile;
  runningState: RunningState;
  audioInputDevices: PyAudioDevice[];
  audioOutputDevices: PyAudioDevice[];

  // Transcription options
  audioInputDeviceName: string;

  // Audio control options
  enableAudioControl: boolean;
  audioControlDeviceName: string;
  audioDelay: number;

  // Video control options
  enableVideoControl: boolean;
  cameraDeviceName: string;
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
  icon: React.ReactNode;
  label: string;
};

type IndicatorConfig = {
  dotClass: string;
  label: string;
};

export default function ControlPanel({
  profile,
  runningState,
  audioInputDevices,
  audioOutputDevices,
  startMutation,
  stopMutation,
  updateConfig,

  // Transcription options
  audioInputDeviceName,

  // Audio control options
  enableAudioControl,
  audioControlDeviceName,
  audioDelay,
  // Video control options
  enableVideoControl,
  cameraDeviceName,
  videoWidth,
  videoHeight,
  enableFaceSwap,
  enableFaceEnhance,
}: ControlPanelProps) {
  const stateConfig: Record<RunningState, StateConfig> = {
    [RunningState.IDLE]: {
      onClick: () => {
        if (!checkCanStart()) return;
        startMutation.mutate();
      },
      className: 'bg-primary hover:bg-primary/90',
      icon: <Play className="h-3.5 w-3.5" />,
      label: 'Start',
    },
    [RunningState.STARTING]: {
      onClick: () => {},
      className: 'bg-primary hover:bg-primary/90',
      icon: <Ellipsis className="h-3.5 w-3.5 animate-pulse" />,
      label: 'Starting...',
    },
    [RunningState.RUNNING]: {
      onClick: () => stopMutation.mutate(),
      className: 'bg-destructive hover:bg-destructive/90',
      icon: <Square className="h-3.5 w-3.5" />,
      label: 'Stop',
    },
    [RunningState.STOPPING]: {
      onClick: () => {},
      className: 'bg-destructive hover:bg-destructive/90',
      icon: <Ellipsis className="h-3.5 w-3.5 animate-pulse" />,
      label: 'Stopping...',
    },
    [RunningState.STOPPED]: {
      onClick: () => {
        if (!checkCanStart()) return;
        startMutation.mutate();
      },
      className: 'bg-primary hover:bg-primary/90',
      icon: <Play className="h-3.5 w-3.5" />,
      label: 'Start',
    },
  };
  const { onClick, className, icon, label } = stateConfig[runningState];

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

  const [exportState, setExportState] = useState<RunningState>(RunningState.IDLE);

  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const videoDevices = useVideoDevices();

  const audioInputDeviceNotFound =
    audioInputDevices.find((d) => d.name === audioInputDeviceName) === undefined;
  const audioControlDeviceNotFound =
    audioOutputDevices.find((d) => d.name === audioControlDeviceName) === undefined;
  const videoDeviceNotFound = videoDevices.find((d) => d.label === cameraDeviceName) === undefined;

  const checkCanStart = () => {
    const checks: { ok: boolean; message: string }[] = [
      { ok: !!profile, message: 'Profile is not set' },
      { ok: !!profile?.username, message: 'Username is not set' },
      { ok: !!profile?.photo, message: 'Photo is not set' },
      { ok: !!profile?.profile_data, message: 'Profile data is not set' },

      {
        ok: !audioInputDeviceNotFound,
        message: `Audio input device "${audioInputDeviceName}" is not found`,
      },
      {
        ok: !enableAudioControl || !audioControlDeviceNotFound,
        message: `Audio control device "${audioControlDeviceName}" is not found`,
      },
      {
        ok: !enableVideoControl || !videoDeviceNotFound,
        message: `Video device "${cameraDeviceName}" is not found`,
      },
    ];

    for (const { ok, message } of checks) {
      if (!ok) {
        alert(message);
        return false;
      }
    }

    return true;
  };

  const getDisabled = (state: RunningState, disableOnRunning: boolean = true): boolean => {
    if (disableOnRunning && state === RunningState.RUNNING) return true;
    return state === RunningState.STARTING || state === RunningState.STOPPING;
  };

  const onExportTranscript = async () => {
    try {
      setExportState(RunningState.RUNNING);

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const filename = `power-interview-export-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.md`;

      const res = await axiosClient.get('/app/export-transcript', { responseType: 'blob' });

      if (res.status !== 200) {
        toast.error('Failed to export transcript');
        return;
      }

      // Create blob + prompt download dialog
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error('Failed to export transcript');
    } finally {
      setExportState(RunningState.IDLE);
    }
  };

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

      // Find camera device id by name
      const videoDeviceId = videoDevices.find((d) => d.label === cameraDeviceName)?.deviceId;

      // Create media stream
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
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
          await videoPreviewRef.current.play().catch(() => {});
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
  }, [
    isVideoDialogOpen,
    enableVideoControl,
    videoDevices,
    cameraDeviceName,
    videoWidth,
    videoHeight,
  ]);

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2">
      {/* Invisible placeholder */}
      <div className="w-24"></div>

      <div className="flex flex-1 justify-center gap-2 items-center">
        {/* Transcription + Dialog */}
        <div className="flex items-center">
          <Dialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <div className="relative">
                    <Button
                      variant="default"
                      size="icon"
                      className="h-8 w-12 border-none rounded-full"
                      disabled={getDisabled(runningState)}
                    >
                      <MessageSquareText className="h-4 w-4" />
                    </Button>
                    {audioInputDeviceNotFound && (
                      <Badge
                        variant="destructive"
                        className="absolute -bottom-1 -right-1 h-4 min-w-4 rounded-full px-1 flex items-center justify-center text-[10px] border"
                      >
                        !
                      </Badge>
                    )}
                  </div>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Transcription options</p>
              </TooltipContent>
            </Tooltip>

            <DialogContent className="flex flex-col w-72 p-4">
              <DialogTitle>Transcription Options</DialogTitle>

              {/* Microphone Select */}
              <div className="mb-3">
                <label className="text-xs text-muted-foreground mb-1 block">Microphone</label>
                <Select
                  value={audioInputDeviceName}
                  onValueChange={(v) => updateConfig({ audio_input_device_name: v })}
                >
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    {audioInputDevices.map((device) => (
                      <SelectItem key={device.name} value={`${device.name}`}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Audio Control Toggle + Dialog */}
        <div className="relative">
          <div
            className={`flex items-center overflow-hidden border ${enableAudioControl ? 'rounded-full' : 'border-destructive rounded-xl text-white'}`}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={enableAudioControl ? 'secondary' : 'destructive'}
                  size="icon"
                  className={`h-8 w-8 border-none rounded-none ${enableAudioControl ? '' : ''}`}
                  disabled={getDisabled(runningState)}
                  onClick={() => {
                    if (enableAudioControl) {
                      toast.success('Audio control disabled');
                    } else {
                      toast.success('Audio control enabled');
                    }
                    updateConfig({ enable_audio_control: !enableAudioControl });
                  }}
                >
                  {enableAudioControl ? (
                    <Mic className="h-4 w-4" />
                  ) : (
                    <MicOff className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle audio control</p>
              </TooltipContent>
            </Tooltip>
            <Dialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant={enableAudioControl ? 'secondary' : 'destructive'}
                      size="icon"
                      className="h-8 w-8 rounded-none border-none"
                      disabled={getDisabled(runningState)}
                    >
                      <Ellipsis className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Audio control options</p>
                </TooltipContent>
              </Tooltip>

              <DialogContent className="flex flex-col w-72 p-4">
                <DialogTitle>Audio Control Options</DialogTitle>

                {/* Output Device Select */}
                <div className="mb-3">
                  <label className="text-xs text-muted-foreground mb-1 block">Output Device</label>
                  <Select
                    value={audioControlDeviceName}
                    onValueChange={(v) => updateConfig({ audio_control_device_name: v })}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioOutputDevices.map((device) => (
                        <SelectItem key={device.name} value={`${device.name}`}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Audio Delay Input */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Audio Delay (ms)
                  </label>
                  <Input
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
          {audioControlDeviceNotFound && (
            <Badge
              variant="destructive"
              className="absolute -bottom-1 -right-1 h-4 min-w-4 rounded-full px-1 flex items-center justify-center text-[10px]"
            >
              !
            </Badge>
          )}
        </div>
        {/* Video Control Toggle + Dialog */}
        <div className="relative">
          <div
            className={`flex items-center overflow-hidden border ${enableVideoControl ? 'rounded-full' : 'border-destructive rounded-xl text-white'}`}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={enableVideoControl ? 'secondary' : 'destructive'}
                  size="icon"
                  className="h-8 w-8 border-none rounded-none"
                  disabled={getDisabled(runningState)}
                  onClick={() => {
                    toast.success(
                      enableVideoControl ? 'Video control disabled' : 'Video control enabled',
                    );
                    updateConfig({ enable_video_control: !enableVideoControl });
                  }}
                >
                  {enableVideoControl ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <VideoOff className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle video control</p>
              </TooltipContent>
            </Tooltip>

            <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      variant={enableVideoControl ? 'secondary' : 'destructive'}
                      size="icon"
                      className="h-8 w-8 rounded-none border-none"
                      disabled={getDisabled(runningState)}
                    >
                      <Ellipsis className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Video control options</p>
                </TooltipContent>
              </Tooltip>

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
                    value={`${cameraDeviceName}`}
                    onValueChange={(v) => updateConfig({ camera_device_name: v })}
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue placeholder="Select camera" />
                    </SelectTrigger>
                    <SelectContent>
                      {videoDevices.map((device) => (
                        <SelectItem key={device.label} value={device.label}>
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
          {videoDeviceNotFound && (
            <Badge
              variant="destructive"
              className="absolute -bottom-1 -right-1 h-4 min-w-4 rounded-full px-1 flex items-center justify-center text-[10px] border"
            >
              !
            </Badge>
          )}{' '}
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Start/Stop Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onClick}
              size="sm"
              className={`h-8 w-16 text-xs  font-medium rounded-full cursor-pointer ${className}`}
              disabled={getDisabled(runningState, false)}
            >
              {icon}
              <span hidden>{label}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Start/Stop Assistant</p>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Export transcription button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onExportTranscript}
              size="sm"
              variant="secondary"
              className="h-8 w-8 text-xs rounded-xl cursor-pointer"
              disabled={exportState === RunningState.RUNNING}
            >
              {exportState === RunningState.IDLE ? (
                <Download className="h-4 w-4" />
              ) : (
                <Loader className="h-4 w-4 animate-spin" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export Transcription</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 px-2 py-1 w-24 rounded-md bg-muted/50">
        <div className={`h-2 w-2 rounded-full ${indicatorDotClass}`} />
        <span className="text-xs text-muted-foreground">{indicatorLabel}</span>
      </div>
    </div>
  );
}
