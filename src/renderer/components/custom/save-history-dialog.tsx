import { FileText, Hash, Loader } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type SaveHistoryReason, useSaveHistoryPrompt } from '@/hooks/use-save-history-guard';
import useTools from '@/hooks/use-tools';
import { getElectron } from '@/lib/utils';
import type { ExportFormat } from '@/types/export';

import { showExportSuccessToast } from './export-success-toast';

/**
 * The action is named in the title and again on the button that goes through with it. "Discard"
 * on its own is the same word for three different losses, and this dialog can appear on a close
 * the user asked for seconds ago and on a Clear they pressed by accident.
 */
const COPY: Record<SaveHistoryReason, { title: string; body: string; discard: string }> = {
  clear: {
    title: 'Save this interview before clearing?',
    body: 'Clearing drops the transcript and the suggestions from this session.',
    discard: 'Clear without saving',
  },
  start: {
    title: 'Save this interview before starting a new one?',
    body: 'Starting a session drops the transcript and the suggestions from the last one.',
    discard: 'Start without saving',
  },
  close: {
    title: 'Save this interview before closing?',
    body: 'Closing drops the transcript and the suggestions from this session.',
    discard: 'Close without saving',
  },
  update: {
    title: 'Save this interview before installing the update?',
    body: 'Installing restarts the app and drops the transcript and the suggestions from this session.',
    discard: 'Install without saving',
  },
};

/**
 * Asks whether to export before something destroys the interview.
 *
 * Mounted once, near the root, because the three things it guards do not share a screen: Clear
 * and Start are on the control panel, which stealth mode does not render, and the close prompt
 * arrives from main with no component of its own at all.
 */
export default function SaveHistoryDialog() {
  const { reason, settle, prompt } = useSaveHistoryPrompt();
  const { exportTranscript } = useTools();
  const [saving, setSaving] = useState<ExportFormat | null>(null);

  // Main vetoes a close that would lose the interview and asks here instead, so the window is
  // held open until one of these two replies is sent. Registered once, for the lifetime of the
  // app: the prompt can arrive at any moment and there is no component tied to closing.
  useEffect(() => {
    const electron = getElectron();
    if (!electron?.onSaveHistoryPrompt) return;

    return electron.onSaveHistoryPrompt(() => {
      void prompt('close').then((proceed) => {
        if (proceed) electron.confirmClose();
        else electron.cancelClose();
      });
    });
  }, [prompt]);

  const save = async (format: ExportFormat) => {
    setSaving(format);
    try {
      const filePath = await exportTranscript(format);
      // Cancelled at the system save dialog. That is backing out of the file, not out of the
      // question, so the prompt stays up rather than reading as a decision to discard.
      if (!filePath) return;

      showExportSuccessToast(filePath, format);
      settle(true);
    } catch (error) {
      console.error(error);
      // The prompt stays open on a failure. Going ahead with the action here would destroy the
      // interview the user has just asked to keep, on the one path where saving did not work.
      toast.error(error instanceof Error ? error.message : 'Failed to export interview');
    } finally {
      setSaving(null);
    }
  };

  const copy = reason ? COPY[reason] : null;
  const busy = saving !== null;

  return (
    <Dialog
      open={reason !== null}
      // Esc, the overlay and the close button all mean "not now", which is the safe answer.
      // Ignored mid-export: the file is still being written and the answer is not settled yet.
      onOpenChange={(next) => {
        if (next || busy) return;
        settle(false);
      }}
    >
      <DialogContent className="max-w-sm" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{copy?.title}</DialogTitle>
          <DialogDescription>
            {copy?.body} Nothing is written to disk until you export, so this is the only chance to
            keep it.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="sm"
              onClick={() => void save('docx')}
              disabled={busy}
              aria-busy={saving === 'docx'}
            >
              {saving === 'docx' ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Save as Word
            </Button>
            <Button
              className="flex-1"
              size="sm"
              variant="outline"
              onClick={() => void save('md')}
              disabled={busy}
              aria-busy={saving === 'md'}
            >
              {saving === 'md' ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Hash className="mr-2 h-4 w-4" />
              )}
              Save as Markdown
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              size="sm"
              variant="ghost"
              onClick={() => settle(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              size="sm"
              variant="destructive"
              onClick={() => settle(true)}
              disabled={busy}
            >
              {copy?.discard}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
