import { CircleCheck, FileIcon, FolderOpenIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getElectron } from '@/lib/utils';
import type { ExportFormat } from '@/types/export';

/**
 * Confirm an export and offer the file.
 *
 * A save dialog's own path is gone the moment it closes, so "where did that go" is the next
 * question every time. Shared between the export menu and the save-before-clearing prompt so
 * the answer does not depend on which one the user reached for.
 */
export function showExportSuccessToast(filePath: string, format: ExportFormat): void {
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
                aria-label="Open the exported file"
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
                aria-label="Show the exported file in its folder"
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
                aria-label="Dismiss"
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
}
