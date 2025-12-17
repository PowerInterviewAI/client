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
import { RunningState } from '@/types/appState';
import { PyAudioDevice } from '@/types/audioDevice';
import { Config } from '@/types/config';
import { MessageSquareText } from 'lucide-react';

interface TranscriptionOptionsProps {
  runningState: RunningState;
  audioInputDevices: PyAudioDevice[];
  config?: Config;
  updateConfig: (config: Partial<Config>) => void;
  audioInputDeviceNotFound: boolean;
  getDisabled: (state: RunningState, disableOnRunning?: boolean) => boolean;
}

export function TranscriptionOptions({
  runningState,
  audioInputDevices,
  config,
  updateConfig,
  audioInputDeviceNotFound,
  getDisabled,
}: TranscriptionOptionsProps) {
  return (
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
  );
}
