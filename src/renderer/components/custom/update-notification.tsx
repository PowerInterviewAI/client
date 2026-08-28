import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { UpdateStatus, useAutoUpdater } from '@/hooks/use-auto-updater';
import { useSaveHistoryGuard } from '@/hooks/use-save-history-guard';

export function UpdateNotification() {
  const { updateStatus, quitAndInstall } = useAutoUpdater();
  const { confirmDiscard } = useSaveHistoryGuard();
  const lastStatusRef = useRef<UpdateStatus | null>(null);
  const downloadToastIdRef = useRef<string | number | null>(null);

  // Held in a ref rather than listed as a dependency. `confirmDiscard` closes over the current
  // app state, so it is a new function on every broadcast from main - several a second during
  // an interview - and naming it in the effect below would re-run the whole status machine
  // that often.
  const confirmDiscardRef = useRef(confirmDiscard);
  useEffect(() => {
    confirmDiscardRef.current = confirmDiscard;
  });

  useEffect(() => {
    if (!updateStatus) return;

    const { status, info, progress, error } = updateStatus;

    if (lastStatusRef.current === status) {
      if (status === UpdateStatus.Downloading && downloadToastIdRef.current && progress) {
        toast.loading(`Downloading update... ${progress.percent.toFixed(0)}%`, {
          id: downloadToastIdRef.current,
          description: `${(progress.transferred / 1024 / 1024).toFixed(1)} MB / ${(progress.total / 1024 / 1024).toFixed(1)} MB`,
        });
      }
      return;
    }

    lastStatusRef.current = status;

    switch (status) {
      case UpdateStatus.Checking:
      case UpdateStatus.NotAvailable:
        break;

      case UpdateStatus.Available:
        if (info) {
          toast.info(`Update Available: v${info.version}`, {
            description: 'Download will start automatically in the background.',
            duration: 5000,
          });
        }
        break;

      case UpdateStatus.Downloading:
        if (progress) {
          downloadToastIdRef.current = toast.loading(
            `Downloading update... ${progress.percent.toFixed(0)}%`,
            {
              description: `${(progress.transferred / 1024 / 1024).toFixed(1)} MB / ${(progress.total / 1024 / 1024).toFixed(1)} MB`,
            }
          );
        }
        break;

      case UpdateStatus.Downloaded:
        if (downloadToastIdRef.current) {
          toast.dismiss(downloadToastIdRef.current);
          downloadToastIdRef.current = null;
        }

        if (info) {
          const isMac = window.electronAPI?.platform === 'darwin';
          toast.success(`Update Downloaded: v${info.version}`, {
            description: isMac
              ? 'Click to open the installer, then drag it into Applications.'
              : 'Click to restart and install the update.',
            duration: Infinity,
            action: {
              label: isMac ? 'Open Installer' : 'Restart Now',
              // Installing takes the app down, so it loses the interview exactly as closing
              // does - and the install cannot be vetoed once started, because the installer is
              // launched before the quit. So the question is asked here, in front of it.
              onClick: () => {
                void confirmDiscardRef.current('update').then((proceed) => {
                  if (proceed) void quitAndInstall();
                });
              },
            },
          });
        }
        break;

      case UpdateStatus.Error:
        if (downloadToastIdRef.current) {
          toast.dismiss(downloadToastIdRef.current);
          downloadToastIdRef.current = null;
        }
        console.error('[UpdateNotification] Update error:', error);
        break;
    }
  }, [updateStatus, quitAndInstall]);

  return null;
}
