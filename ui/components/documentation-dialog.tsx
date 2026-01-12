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
          <h3 className="text-sm font-semibold mb-2">App Guide — Stealth quick start</h3>

          <div className="text-sm text-muted-foreground mb-3 space-y-2">
            <p>
              Quick start: open the app, position the window where you want overlays to appear, then
              press <strong>Ctrl+Alt+S</strong> to toggle stealth mode. While stealth is active the
              window remains visually on top but ignores mouse input and is non-focusable.
            </p>

            <ol className="list-decimal ml-5 space-y-1">
              <li>Arrange window where you want prompts or notes to appear.</li>
              <li>
                Press <strong>Ctrl+Alt+S</strong> to enter stealth (overlay becomes
                non-interactive).
              </li>
              <li>
                Snap with <strong>Ctrl+Alt+1..5</strong>, move with <strong>Ctrl+Alt+Arrow</strong>.
              </li>
              <li>
                Resize with <strong>Ctrl+Shift+Arrow</strong>, adjust opacity with{' '}
                <strong>Ctrl+Shift+PgUp/PgDn</strong>.
              </li>
              <li>
                Exit stealth with <strong>Ctrl+Alt+S</strong> to interact with the app normally.
              </li>
            </ol>

            <p className="mt-2">
              Tip: keep opacity around 0.7–0.9 for readability while letting underlying content
              remain visible.
            </p>
          </div>

          <h3 className="text-sm font-semibold mb-2">
            Why stealth is useful for live coding tests
          </h3>
          <div className="text-sm text-muted-foreground mb-3">
            <p>
              Stealth mode is ideal when you're taking an interview or doing a live coding test: it
              lets you keep prompts, notes, or sample code visible on top of your IDE but prevents
              accidental clicks or focus switches.
            </p>

            <p>
              <strong>Note about screen sharing:</strong> in many full-screen sharing modes a
              transparent, non-focusable overlay may not be captured. This means when stealth is
              active the app window often is not included in a full-screen share in any environment.
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
