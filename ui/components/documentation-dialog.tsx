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
          <h3 className="text-sm font-semibold mb-2">App Guide — Stealth quick start</h3>

          <div className="text-sm text-muted-foreground mb-3 space-y-2">
            <p>
              Quick start: open the app, position the window where you want overlays to appear, then
              press <strong>{stealthKey}</strong> to toggle stealth mode. While stealth is active
              the window remains visually on top but ignores mouse input and is non-focusable.
            </p>

            <ol className="list-decimal ml-5 space-y-1">
              <li>Arrange window where you want prompts or notes to appear.</li>
              <li>
                Press <strong>{stealthKey}</strong> to enter stealth (overlay becomes
                non-interactive).
              </li>
              <li>
                Place the window with <strong>{placeKey}</strong> (numpad-style grid), move it with{' '}
                <strong>{moveKey}</strong>.
              </li>
              <li>
                Resize with <strong>{resizeKey}</strong> and the directional resize hotkeys provided
                by the app; adjust opacity with <strong>{opacityKey}</strong> (toggle modes where
                available).
              </li>
              <li>
                Exit stealth with <strong>{stealthKey}</strong> to interact with the app normally.
              </li>
            </ol>
          </div>

          <h3 className="text-sm font-semibold mt-4 mb-2">Coding Challenge Assistant</h3>
          <div className="text-sm text-muted-foreground mb-3 space-y-2">
            <p>
              The Coding Challenge Assistant helps you solve or analyze coding problems by combining
              live transcripts, code suggestions and optional screenshots from your desktop. When a
              code suggestion is available the app surfaces a dedicated <strong>Code Suggestions</strong>
              panel with generated recommendations and snippets.
            </p>

            <ul className="list-disc ml-5 space-y-1">
              <li>
                Use the Code Suggestions panel to review generated code and copy snippets into your
                editor.
              </li>
              <li>
                When using the desktop client you can capture screenshots to provide visual
                context: <strong>Ctrl+Alt+Shift+S</strong> to capture, <strong>X</strong> to clear,
                and <strong>Enter</strong> to submit (desktop hotkeys).
              </li>
              <li>
                There is a limit on screenshots per suggestion (default <strong>4</strong>). If the
                limit is reached the upload will be rejected by the client and the app will log a
                warning.
              </li>
              <li>
                The transcript panel may be hidden automatically when the UI shows code suggestions
                to prioritize space — toggle or configure this behavior via the settings if needed.
              </li>
            </ul>
          </div>

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
