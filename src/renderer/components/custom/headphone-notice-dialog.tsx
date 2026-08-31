import { Headphones, MicOff, Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface HeadphoneNoticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProceed: () => void;
}

/**
 * Ask for headphones before the session opens.
 *
 * The app captures the interviewer through a loopback of the system's render endpoint, so on
 * speakers the microphone hears the same words a fraction of a second later. What that costs is
 * not cosmetic: the echo arrives as a `Self` final, and `skipDueToRecentSelf` in
 * `transcript.service.ts` then suppresses the live suggestion for the question that was just
 * asked. Silently, at the moment the candidate needs it. See #111.
 *
 * There is no reliable way to detect this from the renderer - `enumerateDevices()` reports what
 * exists, not what the sound is coming out of - so the user's own answer is the only signal
 * available, and it is asked for rather than guessed at.
 *
 * Shown before every session, deliberately with no "don't show again" - whether the call is on
 * speakers is a property of the machine and the meeting, not a setting, and it can change between
 * any two sessions on the same install. A permanent silence option contradicted that: the one
 * fact this dialog exists to establish was the one fact a stale tick could no longer speak to.
 */
export default function HeadphoneNoticeDialog({
  open,
  onOpenChange,
  onProceed,
}: HeadphoneNoticeDialogProps) {
  const handleProceed = () => {
    onOpenChange(false);
    onProceed();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Headphones className="h-4 w-4" />
            Put your headphones on
          </DialogTitle>
          <DialogDescription>
            This session needs the interviewer&apos;s voice going to your ears only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <NoticeRow
            icon={<Volume2 className="h-4 w-4" />}
            text="On speakers, your microphone hears the interviewer as well as you do."
          />
          <NoticeRow
            icon={<MicOff className="h-4 w-4" />}
            // The failure is the quiet one, so it is named rather than left as "quality issues".
            text="The app then reads their question as something you said, and stops answering it - with no error to tell you why."
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleProceed}>
            My headphones are on
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoticeRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <p className="flex-1 text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
