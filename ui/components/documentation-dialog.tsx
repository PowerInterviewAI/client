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
import React from 'react';

interface DocumentationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DocumentationDialog({ open, onOpenChange }: DocumentationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Documentation</DialogTitle>
          <DialogDescription>Reference documentation for the application.</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <h3 className="text-sm font-semibold mb-2">Hotkeys</h3>
          <div className="grid grid-cols-2 gap-2">
            {HOTKEYS.map(([k, d]) => (
              <React.Fragment key={k}>
                <div className="px-2 py-1 rounded bg-muted text-[11px] font-semibold min-w-[90px]">
                  {k}
                </div>
                <div className="text-sm">{d}</div>
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
