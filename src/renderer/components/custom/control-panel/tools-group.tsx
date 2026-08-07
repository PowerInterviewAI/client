import {
  Captions,
  CaptionsOff,
  CircleCheck,
  FileIcon,
  FileText,
  FolderOpenIcon,
  Hash,
  Loader,
  Save,
  Trash2,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppState } from '@/hooks/use-app-state';
import useTools from '@/hooks/use-tools';
import { useTranscriptPanel } from '@/hooks/use-transcript-panel';
import { Hotkey, HOTKEYS } from '@/lib/hotkeys';
import { getElectron } from '@/lib/utils';
import { RunningState } from '@/types/app-state';
import type { ExportFormat } from '@/types/export';

interface ToolsGroupProps {
  getDisabled: (state: RunningState, disableOnRunning?: boolean) => boolean;
}

export function ToolsGroup({ getDisabled }: ToolsGroupProps) {
  const { runningState } = useAppState();
  const { exporting, exportTranscript, clearAll, setPlaceholderData } = useTools();
  const { visible: transcriptVisible, toggle: onToggleTranscript } = useTranscriptPanel();
  const [clearing, setClearing] = useState(false);

  const onClear = async () => {
    setClearing(true);
    try {
      // Placeholder state only rewrites what the renderer sees. The service buffers keep the
      // real transcripts and suggestions until clearAll drops them, so Clear has to do both.
      await clearAll();
      await setPlaceholderData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to clear');
    } finally {
      setClearing(false);
    }
  };

  const onExportTranscript = async (format: ExportFormat) => {
    try {
      const filePath = await exportTranscript(format);
      if (!filePath) return;
      const electron = getElectron();
      const toastId = `export-${Date.now()}`;
      toast.custom(
        () => (
          <div
            className="flex items-center gap-2 w-full px-4 py-3 rounded-lg border shadow-md"
            style={{
              background: 'var(--success-bg)',
              borderColor: 'var(--success-border)',
              color: 'var(--success-text)',
            }}
          >
            <CircleCheck className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-sm font-medium">
              Interview exported as {format === 'md' ? 'Markdown' : 'Word'}
            </span>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0"
                    onClick={() => electron?.openFile(filePath)}
                  >
                    <FileIcon className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open file</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0"
                    onClick={() => electron?.showInFolder(filePath)}
                  >
                    <FolderOpenIcon className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show in folder</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => toast.dismiss(toastId)}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Dismiss</TooltipContent>
              </Tooltip>
            </div>
          </div>
        ),
        { id: toastId, duration: 10_000, style: { width: 'var(--width, 356px)' } }
      );
    } catch (error) {
      console.error(error);
      toast.error('Failed to export interview');
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* View-only preference, so it stays available while the assistant runs */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            onClick={onToggleTranscript}
            size="sm"
            className="h-8 w-8 text-xs rounded-xl cursor-pointer"
            aria-pressed={transcriptVisible}
          >
            {transcriptVisible ? (
              <Captions className="h-4 w-4" />
            ) : (
              <CaptionsOff className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {transcriptVisible ? 'Hide Transcription' : 'Show Transcription'} (
            {HOTKEYS[Hotkey.ToggleTranscript].combo})
          </p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            onClick={onClear}
            size="sm"
            className="h-8 w-8 text-xs rounded-xl cursor-pointer"
            disabled={getDisabled(runningState) || exporting || clearing}
          >
            {clearing ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Clear</p>
        </TooltipContent>
      </Tooltip>
      {/* Non-modal for the same reason as the titlebar menu: a modal menu locks body pointer
          events, and picking a format unmounts the menu before it releases the lock. */}
      <DropdownMenu modal={false}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 text-xs rounded-xl cursor-pointer"
                disabled={getDisabled(runningState) || exporting}
              >
                {exporting ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export Interview</p>
          </TooltipContent>
        </Tooltip>
        {/* Opens upward, and not just for looks: the menu is portalled into the overflow-hidden
            <main> from main-frame, and the control panel is the bottom-most thing in it, so a
            downward menu would open past that edge and get clipped rather than merely flipped. */}
        <DropdownMenuContent align="end" side="top">
          <DropdownMenuItem onClick={() => void onExportTranscript('docx')}>
            <FileText className="mr-2 h-4 w-4" />
            Word Document (.docx)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void onExportTranscript('md')}>
            <Hash className="mr-2 h-4 w-4" />
            Markdown (.md)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
