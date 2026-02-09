import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HOTKEYS } from '@/lib/hotkeys';

interface DocumentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DocumentationDialog({ open, onOpenChange }: DocumentationDialogProps) {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.electronAPI?.autoUpdater
        .getVersion()
        .then((res) => {
          if (res?.success && res.version) setVersion(res.version);
        })
        .catch(() => {
          /* ignore */
        });
    } catch (e) {
      console.error('Failed to get app version:', e);
    }
  }, []);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>About Power Interview {version ? `v${version}` : ''}</DialogTitle>
          <DialogDescription>
            <p>
              Power Interview is an AI-powered tool designed to assist with technical interviews by
              providing real-time reply suggestions and screen-based code suggestions.
            </p>
            <p>
              Live face swap is a feature that allows users to replace their face with a virtual
              avatar during video calls, enhancing privacy and adding a fun element to online
              interactions.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 overflow-auto flex-1">
          <h3 className="text-sm font-semibold mb-2">Hotkeys</h3>
          <div className="grid grid-cols-3 gap-2">
            {HOTKEYS.map(([k, d, l]) => (
              <React.Fragment key={`${k}-${d}`}>
                <div className="col-span-1">
                  <div className="px-2 py-1 rounded bg-muted text-[11px] font-semibold min-w-22.5">
                    {k}
                  </div>
                </div>
                <div className="col-span-2 text-sm">{l}</div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
