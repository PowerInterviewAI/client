import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAssistantState } from '@/hooks/use-assistant-state';
import axiosClient from '@/lib/axiosClient';
import { RunningState } from '@/types/appState';
import { Download, Loader } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface MainControlsProps {
  stateConfig: {
    onClick: () => void;
    className: string;
    icon: React.ReactNode;
    label: string;
  };
  getDisabled: (state: RunningState, disableOnRunning?: boolean) => boolean;
}

export function MainControls({ stateConfig, getDisabled }: MainControlsProps) {
  const { runningState } = useAssistantState();
  const { onClick, className, icon, label } = stateConfig;
  const [exportState, setExportState] = useState<RunningState>(RunningState.IDLE);

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

  const handleStartStopClick = async () => {
    try {
      // Call the provided click handler. It may be sync or return a Promise.
      // eslint-disable-next-line
      const res = onClick() as any;

      // If we're currently running, the user is stopping — wait for any async stop
      // action to complete before asking about export.
      if (runningState === RunningState.RUNNING) {
        if (res && typeof res.then === 'function') {
          try {
            await res;
          } catch (e) {
            // ignore errors from the stop action here; still show export prompt
            console.error('Error awaiting stop action', e);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* Start/Stop Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleStartStopClick}
            size="sm"
            className={`h-8 w-16 text-xs font-medium rounded-full cursor-pointer ${className}`}
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

      {/* Export transcription button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onExportTranscript}
            size="sm"
            className="h-8 w-8 text-xs rounded-xl cursor-pointer"
            disabled={getDisabled(runningState) || exportState === RunningState.RUNNING}
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
    </>
  );
}
