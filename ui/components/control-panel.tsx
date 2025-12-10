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
import { Config } from '@/types/config';
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
  Moon,
  Play,
  Square,
  Sun,
  Video,
  VideoOff,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface ControlPanelProps {
  runningState: RunningState;
  audioInputDevices: PyAudioDevice[];
  audioOutputDevices: PyAudioDevice[];
  startMutation: UseMutationResult<void, APIError, void, unknown>;
  stopMutation: UseMutationResult<void, APIError, void, unknown>;

  onProfileClick: () => void;
  onThemeToggle: () => void;
  isDark: boolean;

  config?: Config;
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
  runningState,
  audioInputDevices,
  audioOutputDevices,
  startMutation,
  stopMutation,

  onProfileClick,
  onThemeToggle,
  isDark,

  config,
  updateConfig,
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
    audioInputDevices.find((d) => d.name === config?.audio_input_device_name) === undefined;
  const audioControlDeviceNotFound =
    audioOutputDevices.find((d) => d.name === config?.audio_control_device_name) === undefined;
  const videoDeviceNotFound =
    videoDevices.find((d) => d.label === config?.camera_device_name) === undefined;

  const checkCanStart = () => {
    const checks: { ok: boolean; message: string }[] = [
      { ok: !!config?.profile, message: 'Profile is not set' },
      { ok: !!config?.profile?.username, message: 'Username is not set' },
      { ok: !!config?.profile?.photo, message: 'Photo is not set' },
      { ok: !!config?.profile?.profile_data, message: 'Profile data is not set' },

      {
        ok: !audioInputDeviceNotFound,
        message: `Audio input device "${config?.audio_input_device_name}" is not found`,
      },
      {
        ok: !config?.enable_audio_control || !audioControlDeviceNotFound,
        message: `Audio control device "${config?.audio_control_device_name}" is not found`,
      },
      {
        ok: !config?.enable_video_control || !videoDeviceNotFound,
        message: `Video device "${config?.camera_device_name}" is not found`,
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
      const videoDeviceId = videoDevices.find(
        (d) => d.label === config?.camera_device_name,
      )?.deviceId;

      // Create media stream
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined,
          width: config?.video_width,
          height: config?.video_height,
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
    config?.enable_video_control,
    videoDevices,
    config?.camera_device_name,
    config?.video_width,
    config?.video_height,
  ]);

  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2">
      {/* Profile */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onProfileClick}
              className="rounded-md hover:bg-muted h-10"
            >
              <div className="flex items-center gap-2 text-foreground">
                {config?.profile?.photo ? (
                  <Image
                    src={config?.profile?.photo}
                    alt="Profile preview"
                    className="w-8 h-8 rounded-full object-cover border"
                    width={32}
                    height={32}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground border">
                    {config?.profile?.username
                      ? config?.profile?.username.charAt(0).toUpperCase()
                      : '?'}
                  </div>
                )}
                <p className="text-sm font-medium">{config?.profile?.username}</p>
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Edit profile</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onThemeToggle}
              className="h-9 w-9 p-0 hover:bg-muted"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isDark ? 'Switch to light mode' : 'Switch to dark mode'}</p>
          </TooltipContent>
        </Tooltip>
      </div>

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
                  value={config?.audio_input_device_name}
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
            className={`flex items-center overflow-hidden border ${config?.enable_audio_control ? 'rounded-full' : 'border-destructive rounded-xl text-white'}`}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={config?.enable_audio_control ? 'secondary' : 'destructive'}
                  size="icon"
                  className={`h-8 w-8 border-none rounded-none ${config?.enable_audio_control ? '' : ''}`}
                  disabled={getDisabled(runningState)}
                  onClick={() => {
                    if (config?.enable_audio_control) {
                      toast.success('Audio control disabled');
                    } else {
                      toast.success('Audio control enabled');
                    }
                    updateConfig({ enable_audio_control: !config?.enable_audio_control });
                  }}
                >
                  {config?.enable_audio_control ? (
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
                      variant={config?.enable_audio_control ? 'secondary' : 'destructive'}
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
                    value={config?.audio_control_device_name}
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
                    value={config?.audio_delay_ms}
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
            className={`flex items-center overflow-hidden border ${config?.enable_video_control ? 'rounded-full' : 'border-destructive rounded-xl text-white'}`}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={config?.enable_video_control ? 'secondary' : 'destructive'}
                  size="icon"
                  className="h-8 w-8 border-none rounded-none"
                  disabled={getDisabled(runningState)}
                  onClick={() => {
                    toast.success(
                      config?.enable_video_control
                        ? 'Video control disabled'
                        : 'Video control enabled',
                    );
                    updateConfig({ enable_video_control: !config?.enable_video_control });
                  }}
                >
                  {config?.enable_video_control ? (
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
                      variant={config?.enable_video_control ? 'secondary' : 'destructive'}
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
                    value={`${config?.camera_device_name}`}
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
                    value={`${config?.video_width}x${config?.video_height}`}
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
                    variant={config?.enable_face_swap ? 'default' : 'outline'}
                    size="sm"
                    className="w-16"
                    onClick={() => updateConfig({ enable_face_swap: !config?.enable_face_swap })}
                  >
                    {config?.enable_face_swap ? 'On' : 'Off'}
                  </Button>
                </div>

                {/* Face Enhance Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs">Face Enhance</span>
                  <Button
                    variant={config?.enable_face_enhance ? 'default' : 'outline'}
                    size="sm"
                    className="w-16"
                    onClick={() =>
                      updateConfig({ enable_face_enhance: !config?.enable_face_enhance })
                    }
                  >
                    {config?.enable_face_enhance ? 'On' : 'Off'}
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
