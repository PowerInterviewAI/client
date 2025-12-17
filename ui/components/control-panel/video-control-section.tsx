'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Config } from '@/types/config';
import { Ellipsis, Video, VideoOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface VideoControlSectionProps {
  runningState: RunningState;
  config?: Config;
  updateConfig: (config: Partial<Config>) => void;
  videoDeviceNotFound: boolean;
  getDisabled: (state: RunningState, disableOnRunning?: boolean) => boolean;
}

export function VideoControlSection({
  runningState,
  config,
  updateConfig,
  videoDeviceNotFound,
  getDisabled,
}: VideoControlSectionProps) {
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
    <div className="relative">
      <div
        className={`flex items-center overflow-hidden border ${
          config?.enable_video_control ? 'rounded-full' : 'border-destructive rounded-xl text-white'
        }`}
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
                  config?.enable_video_control ? 'Video control disabled' : 'Video control enabled',
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
                onClick={() => updateConfig({ enable_face_enhance: !config?.enable_face_enhance })}
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
      )}
    </div>
  );
}
