import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAssistantState } from '@/hooks/use-assistant-state';
import { RunningState } from '@/types/app-state';
import { Download, Loader } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ToolsGroupProps {
  getDisabled: (state: RunningState, disableOnRunning?: boolean) => boolean;
}

export function ToolsGroup({ getDisabled }: ToolsGroupProps) {
  const { runningState } = useAssistantState();
  const [exportState, setExportState] = useState<RunningState>(RunningState.IDLE);

  const onExportTranscript = async () => {
    try {
      setExportState(RunningState.RUNNING);

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const filename = `power-interview-export-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.md`;

      const res = await axiosClient.get('/api/export-transcript', { responseType: 'blob' });

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

  return (
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
  );
}
