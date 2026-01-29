'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useVideoDevices } from '@/hooks/video-devices';
import { RunningState } from '@/types/appState';
import { PyAudioDevice } from '@/types/audioDevice';
import { Config } from '@/types/config';
import { Ellipsis, Video, VideoOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface VideoOptionsProps {
  runningState: RunningState;
  config?: Config;
  updateConfig: (config: Partial<Config>) => void;
  videoDeviceNotFound: boolean;
  audioOutputDevices: PyAudioDevice[];
  getDisabled: (state: RunningState, disableOnRunning?: boolean) => boolean;
}

export function VideoOptions({
  runningState,
  config,
  updateConfig,
  videoDeviceNotFound,
  audioOutputDevices,
  getDisabled,
}: VideoOptionsProps) {
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const videoDevices = useVideoDevices();

  const OBS_CAMERA_PREFIX = 'OBS Virtual';
  const obsCameraExists =
    videoDevices.length > 0 ? videoDevices.some((d) => d.label.includes(OBS_CAMERA_PREFIX)) : true;

  const VB_AUDIO_INPUT_PREFIX = 'CABLE Input (VB-Audio Virtual';
  const vbInputExists =
    audioOutputDevices.length > 0
      ? audioOutputDevices.some((d) => d.name.startsWith(VB_AUDIO_INPUT_PREFIX))
      : true;

  useEffect(() => {
    // Disable face swap if required devices are not found
    if (!obsCameraExists && config?.face_swap) {
      updateConfig({ face_swap: false });
      toast.error('OBS Virtual Camera not found — disabling Face Swap');
    }
    if (!vbInputExists && config?.face_swap) {
      updateConfig({ face_swap: false });
      toast.error('VB-Audio Input device not found — disabling Face Swap');
    }
  }, [obsCameraExists, vbInputExists, config?.face_swap, updateConfig]);

  const usableVideoDevices = videoDevices.filter((d) => {
    if (d.label.toLowerCase().startsWith(OBS_CAMERA_PREFIX.toLowerCase())) return false;
    if (d.label.toLowerCase().includes('virtual')) return false;
    return true;
  });

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
    config?.face_swap,
    videoDevices,
    config?.camera_device_name,
    config?.video_width,
    config?.video_height,
  ]);

  return (
    <div className="relative">
      <div
        className={`flex items-center overflow-hidden border rounded-full ${
          config?.face_swap ? '' : 'text-white'
        }`}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={config?.face_swap ? 'secondary' : 'destructive'}
              size="icon"
              className="h-8 w-8 border-none rounded-none"
              disabled={
                getDisabled(runningState) ||
                ((!obsCameraExists || !vbInputExists) && !config?.face_swap)
              }
              onClick={() => {
                const tryingToEnable = !config?.face_swap;
                if (tryingToEnable && (!obsCameraExists || !vbInputExists)) {
                  alert('OBS Virtual Camera or VB-Audio Input not found. Face Swap requires both.');
                  return;
                }
                toast.success(config?.face_swap ? 'Face Swap disabled' : 'Face Swap enabled');
                updateConfig({ face_swap: !config?.face_swap });
              }}
            >
              {config?.face_swap ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toggle Face Swap</p>
          </TooltipContent>
        </Tooltip>

        <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button
                  variant={config?.face_swap ? 'secondary' : 'destructive'}
                  size="icon"
                  className="h-8 w-8 rounded-none border-none"
                  disabled={getDisabled(runningState)}
                >
                  <Ellipsis className="h-4 w-4" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Face Swap options</p>
            </TooltipContent>
          </Tooltip>

          <DialogContent className="flex flex-col w-72 p-4 gap-4">
            <DialogTitle>Face Swap Options</DialogTitle>

            {!obsCameraExists && (
              <div className="text-sm text-destructive">
                OBS Virtual Camera not found.
                <br />
                Face Swap feature requires OBS Virtual Camera.
                <br />
                Download and install OBS studio from
                <br />
                <span className="underline">https://obsproject.com/download</span>
                <br />
                and then restart this application.
              </div>
            )}
            {!vbInputExists && (
              <div className="text-sm text-destructive">
                VB-Audio Input device not found.
                <br />
                Audio Sync feature requires VB-Audio Virtual Cable.
                <br />
                Download and install VBCABLE Driver from
                <br />
                <span className="underline">https://vb-audio.com/Cable/</span>
              </div>
            )}

            {obsCameraExists && vbInputExists && (
              <>
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
                      {usableVideoDevices.map((device) => (
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

                {/* Audio Delay */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Audio Sync Delay (ms)
                  </label>
                  <Input
                    type="number"
                    value={config?.audio_delay_ms ?? ''}
                    onChange={(e) => updateConfig({ audio_delay_ms: Number(e.target.value) || 0 })}
                    className="w-full h-8 px-2 text-xs border rounded-md bg-background"
                    min={0}
                    step={10}
                  />
                </div>
              </>
            )}
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
      )}
    </div>
  );
}
