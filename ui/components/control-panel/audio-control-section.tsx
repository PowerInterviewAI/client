'use client';

// Badge removed; audio control device indicator no longer used
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
// Output device selection removed
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RunningState } from '@/types/appState';
import { PyAudioDevice } from '@/types/audioDevice';
import { Config } from '@/types/config';
import { Ellipsis, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

interface AudioControlSectionProps {
  runningState: RunningState;
  audioOutputDevices: PyAudioDevice[];
  config?: Config;
  updateConfig: (config: Partial<Config>) => void;
  getDisabled: (state: RunningState, disableOnRunning?: boolean) => boolean;
}

export function AudioControlSection({
  runningState,
  audioOutputDevices,
  config,
  updateConfig,
  getDisabled,
}: AudioControlSectionProps) {
  return (
    <div className="relative">
      <div
        className={`flex items-center overflow-hidden border ${
          config?.enable_audio_control ? 'rounded-full' : 'border-destructive rounded-xl text-white'
        }`}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={config?.enable_audio_control ? 'secondary' : 'destructive'}
              size="icon"
              className={`h-8 w-8 border-none rounded-none ${
                config?.enable_audio_control ? '' : ''
              }`}
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

            {/* (Output device selection removed) */}

            {/* Audio Delay Input */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Audio Delay (ms)</label>
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
      {/* audio control device not applicable */}
    </div>
  );
}
