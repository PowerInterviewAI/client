import HeadphoneNoticeDialog from '@/components/custom/headphone-notice-dialog';
import { MockInterviewSetupFields } from '@/components/custom/mock-interview-setup-fields';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMockInterviewSetupForm } from '@/hooks/use-mock-interview-setup-form';
import type { MockInterviewSetup } from '@/types/mock-interview';

interface MockInterviewSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (setup: MockInterviewSetup) => Promise<void>;
}

/**
 * The control bar's entry point into a mock interview - the same fields the full-page setup
 * screen shows (`useMockInterviewSetupForm`, shared rather than duplicated), in a dialog, so
 * starting one is reachable without leaving the live assistant's own screen. Uses the same
 * profile and job context the live assistant already reads off the account - nothing here asks
 * for a CV or job description a second time.
 */
export function MockInterviewSetupDialog({
  open,
  onOpenChange,
  onStart,
}: MockInterviewSetupDialogProps) {
  const form = useMockInterviewSetupForm(onStart);
  const { starting, headphoneNoticeOpen, setHeadphoneNoticeOpen, handleStartClick, startAfterNotice } =
    form;

  return (
    <>
      {/* Handed off to the headphone notice rather than stacked under it. Two modal dialogs open
          at once each hold their own scroll lock and pointer-events layer, and here they would
          both unmount in the same commit as a route change - the shape that already left this app
          unclickable once with menus, which is why every menu in it is `modal={false}`.

          Only `open` is computed; this component stays mounted either way, so the form state
          lives through the notice and comes back untouched if the candidate cancels out of it. */}
      <Dialog open={open && !headphoneNoticeOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mock interview</DialogTitle>
            <DialogDescription>
              The AI asks, you answer out loud. Nothing is saved unless you export it.
            </DialogDescription>
          </DialogHeader>

          <MockInterviewSetupFields form={form} />

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartClick} disabled={starting}>
              {starting ? 'Starting…' : 'Start mock interview'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HeadphoneNoticeDialog
        open={headphoneNoticeOpen}
        onOpenChange={setHeadphoneNoticeOpen}
        onProceed={() => void startAfterNotice()}
        variant="mock"
      />
    </>
  );
}
