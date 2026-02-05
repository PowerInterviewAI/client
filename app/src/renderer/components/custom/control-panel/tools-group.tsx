import { Loader, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAssistantState } from '@/hooks/use-assistant-state';
import useTools from '@/hooks/use-tools';
import { RunningState } from '@/types/app-state';

interface ToolsGroupProps {
  getDisabled: (state: RunningState, disableOnRunning?: boolean) => boolean;
}

export function ToolsGroup({ getDisabled }: ToolsGroupProps) {
  const { runningState } = useAssistantState();
  const { exporting, exportTranscript } = useTools();

  const onExportTranscript = async () => {
    try {
      await exportTranscript();
      toast.success('Transcript exported successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export transcript');
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={onExportTranscript}
          size="sm"
          className="h-8 w-8 text-xs rounded-xl cursor-pointer"
          disabled={getDisabled(runningState) || exporting}
        >
          {exporting ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Export Transcription</p>
      </TooltipContent>
    </Tooltip>
  );
}
