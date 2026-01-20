'use client';

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
import React, { useMemo } from 'react';

interface DocumentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DocumentationDialog({ open, onOpenChange }: DocumentationDialogProps) {
  const stealthKey = useMemo(
    () => HOTKEYS.find(([, short]) => /stealth/i.test(short))?.[0] ?? 'Ctrl+Shift+Q',
    [],
  );
  const opacityKey = useMemo(
    () => HOTKEYS.find(([, short]) => /opacity/i.test(short))?.[0] ?? 'Ctrl+Shift+D',
    [],
  );
  const placeKey = useMemo(
    () =>
      HOTKEYS.find(([, short]) => /place window/i.test(short) || /place/i.test(short))?.[0] ??
      'Ctrl+Shift+1-9',
    [],
  );
  const moveKey = useMemo(
    () => HOTKEYS.find(([, short]) => /move window/i.test(short))?.[0] ?? 'Ctrl+Alt+Shift+Arrow',
    [],
  );
  const resizeKey = useMemo(
    () => HOTKEYS.find(([, short]) => /resize/i.test(short))?.[0] ?? 'Ctrl+Win+Shift+Arrow',
    [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Documentation</DialogTitle>
          <DialogDescription>Reference documentation for the application.</DialogDescription>
        </DialogHeader>

        <div className="py-2 overflow-auto flex-1">
          <h3 className="text-sm font-semibold mb-2">Hotkeys</h3>
          <div className="grid grid-cols-3 gap-2">
            {HOTKEYS.map(([k, d, l]) => (
              <React.Fragment key={`${k}-${d}`}>
                <div className="col-span-1">
                  <div className="px-2 py-1 rounded bg-muted text-[11px] font-semibold min-w-[90px]">
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
