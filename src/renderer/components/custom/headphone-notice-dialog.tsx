import { Headphones, MicOff, Volume2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConfigStore } from '@/hooks/use-config-store';

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
 */
export default function HeadphoneNoticeDialog({
  open,
  onOpenChange,
  onProceed,
}: HeadphoneNoticeDialogProps) {
  const { config, updateConfig } = useConfigStore();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleProceed = () => {
    // Persisted on the way through rather than on the tick, so a user who changes their mind and
    // cancels has not already silenced a warning they never acted on.
    if (dontShowAgain && !config?.headphoneNoticeAcknowledged) {
      updateConfig({ headphoneNoticeAcknowledged: true }).catch((e) =>
        console.error('Failed to persist the headphone notice preference', e)
      );
    }
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

        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Checkbox
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
          />
          Do not show this again
        </label>

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
