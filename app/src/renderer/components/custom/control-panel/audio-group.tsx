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
import { useAssistantState } from '@/hooks/use-assistant-state';
import { useConfigStore } from '@/hooks/use-config-store';
import { RunningState } from '@/types/app-state';
import { type AudioDevice } from '@/types/audio-device';
import { Mic } from 'lucide-react';

interface AudioGroupProps {
  audioInputDevices: AudioDevice[];
  audioInputDeviceNotFound: boolean;
  getDisabled: (state: RunningState, disableOnRunning?: boolean) => boolean;
}

export function AudioGroup({
  audioInputDevices,
  audioInputDeviceNotFound,
  getDisabled,
}: AudioGroupProps) {
  const { runningState } = useAssistantState();
  const { config, updateConfig } = useConfigStore();
  const usableAudioInputDevices = audioInputDevices.filter((d) => {
    if (d.name.toLowerCase().includes('virtual')) return false;
    return true;
  });

  return (
    <div className="flex items-center">
      <Dialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <div className="relative">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-12 border-none rounded-full"
                  disabled={getDisabled(runningState)}
                >
                  <Mic className="h-4 w-4" />
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
            <p>Audio options</p>
          </TooltipContent>
        </Tooltip>

        <DialogContent className="flex flex-col w-72 p-4">
          <DialogTitle>Audio Options</DialogTitle>

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
                {usableAudioInputDevices.map((device) => (
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
