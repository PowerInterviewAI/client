import React, { useEffect, useState } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { APP_NAME } from '@/lib/consts';
import { LANGUAGES } from '@/types/language';

import ExternalLink from './external-link';
import { HotkeyCheatsheet } from './hotkey-cheatsheet';

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
          <DialogTitle>
            {APP_NAME} {version ? `v${version}` : ''}
          </DialogTitle>
          <DialogDescription>
            <p>
              {APP_NAME} is an AI-powered assistant that enhances your interview experience with
              real-time suggestions, on-screen code recommendations.
            </p>
            <p className="mt-2 text-sm">
              For full documentation, visit{' '}
              <ExternalLink
                href="https://www.powerinterviewai.com/docs"
                className="text-primary underline"
              >
                powerinterviewai.com/docs
              </ExternalLink>
              .
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-auto flex-1">
          <Accordion type="multiple" defaultValue={['hotkeys']} className="w-full">
            <AccordionItem value="lost-window">
              <AccordionTrigger className="text-sm font-semibold">
                Lost the window?
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  In stealth mode {APP_NAME} leaves the taskbar and the macOS Dock so it is not
                  visible when you share your screen, which also means a minimized window has no
                  button to click. Just launch {APP_NAME} again: it does not start a second copy, it
                  brings this window back. Outside stealth mode the usual taskbar button and Dock
                  icon are there.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="language">
              <AccordionTrigger className="text-sm font-semibold">
                Interviewing in another language
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  The language button on the control bar sets the language of the whole session:
                  which speech model transcribes the call, what language suggestions are written in,
                  and the language of the exported report.
                </p>
                {/* A list rather than a sentence: at 28 entries the run-on paragraph this used to
                    be could not be scanned for one's own language, which is the only question a
                    reader opens this section with. Derived from LANGUAGES so it cannot drift. */}
                <p className="mt-2 text-sm text-muted-foreground">
                  {LANGUAGES.length} languages are supported:{' '}
                  {/* Each name is its own isolate rather than one `dir="auto"` span around the
                      lot. Joined into a single string, the two right-to-left names sit adjacent
                      with only a neutral between them, so the bidi algorithm resolves that
                      separator right-to-left too and lays the pair out as one run - printing the
                      last two languages in the list in the opposite order to every other pair. */}
                  {LANGUAGES.map((language, index) => (
                    <React.Fragment key={language.code}>
                      {index > 0 && ' · '}
                      <bdi>{language.nativeName}</bdi>
                    </React.Fragment>
                  ))}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  You can change it mid-interview. Suggestions follow immediately, from the next
                  answer onward. Speech recognition takes a moment longer: it reconnects, so the
                  sentence being spoken at that instant may be cut short in the transcript.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="microphone">
              <AccordionTrigger className="text-sm font-semibold">
                Changing microphone mid-interview
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-sm text-muted-foreground">
                  The microphone button on the control bar stays available while an interview is
                  running. If your headset dies, is unplugged, or was the wrong device to begin
                  with, pick another one there rather than stopping the assistant - stopping it
                  clears the transcript and the suggestions with it.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The change takes effect immediately and transcription keeps running, so nothing is
                  cut short. If the device you pick cannot be opened - unplugged, or in use by
                  another app - the interview carries on using the previous one and the app says so.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="hotkeys">
              <AccordionTrigger className="text-sm font-semibold">Hotkeys</AccordionTrigger>
              <AccordionContent>
                <HotkeyCheatsheet />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
