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
      <DialogContent className="max-w-lg w-full max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Documentation</DialogTitle>
          <DialogDescription>Reference documentation for the application.</DialogDescription>
        </DialogHeader>

        <div className="py-2 overflow-auto flex-1">
          <h3 className="text-sm font-semibold mb-2">Stealth Mode — Overview</h3>

          <div className="text-sm text-muted-foreground mb-3 space-y-2">
            <p>
              Stealth mode makes the window visually present but non-interactive: it ignores mouse
              input, is non-focusable, and can be kept always-on-top. This is useful for overlaying
              interview notes or prompts while you use other apps.
            </p>

            <ul className="list-disc ml-5">
              <li>Toggle stealth quickly with <strong>Ctrl+Alt+S</strong>.</li>
              <li>Use corner hotkeys (Ctrl+Alt+1..5) to snap the window to common locations.</li>
              <li>Adjust opacity while stealth is active with <strong>Ctrl+Shift+PgUp/PgDn</strong>.</li>
              <li>Move or resize the window using arrow hotkeys without leaving stealth.</li>
            </ul>

            <p>
              Tip: keep opacity around 0.7-0.9 for readability while letting underlying content remain
              visible. Exit stealth to interact with the app normally.
            </p>
          </div>

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
