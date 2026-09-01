import { useEffect, useRef } from 'react';

import HeadphoneNoticeDialog from '@/components/custom/headphone-notice-dialog';
import { MockInterviewSetupFields } from '@/components/custom/mock-interview-setup-fields';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { useMockInterviewSetupForm } from '@/hooks/use-mock-interview-setup-form';
import type { MockInterviewSetup } from '@/types/mock-interview';

interface SetupScreenProps {
  onStart: (setup: MockInterviewSetup) => Promise<void>;
  /**
   * Why the last attempt ended up back here, when it did. Main sets `session.error` on the two
   * dead ends that land on this screen without the user asking - a first question that could not
   * be generated, and a session that reached the end with nothing recorded - and until this was
   * rendered it was written and never read, so both looked like the app forgetting the session.
   */
  error?: string | null;
}

export function SetupScreen({ onStart, error }: SetupScreenProps) {
  const form = useMockInterviewSetupForm(onStart);
  const { starting, headphoneNoticeOpen, setHeadphoneNoticeOpen, handleStartClick, startAfterNotice } =
    form;
  const headingRef = useRef<HTMLHeadingElement>(null);

  // This screen is reached by unmounting whatever was on screen before (SessionScreen after
  // "Practise again", or nothing on the very first visit) rather than by a real navigation, so
  // the browser has no route-change moment to move focus on its own. Without this, focus is
  // simply lost - it falls back to <body>, and a keyboard or screen-reader user has to find
  // their way back into the app from the very top.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex-1 flex items-start justify-center overflow-y-auto p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          {/* CardTitle renders a <div>, not a heading, and has no `asChild` to promote it - this
              route otherwise has no landmark a screen reader's heading navigation can land on, so
              this carries CardTitle's own classes directly on a real <h1>. */}
          <h1 ref={headingRef} tabIndex={-1} className="leading-none font-semibold text-xl">
            Mock interview
          </h1>
          <CardDescription>
            The AI asks, you answer out loud. Nothing is saved unless you export it.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <MockInterviewSetupFields form={form} />
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button onClick={handleStartClick} disabled={starting}>
            {starting ? 'Starting…' : 'Start mock interview'}
          </Button>
        </CardFooter>
      </Card>

      <HeadphoneNoticeDialog
        open={headphoneNoticeOpen}
        onOpenChange={setHeadphoneNoticeOpen}
        onProceed={() => void startAfterNotice()}
        variant="mock"
      />
    </div>
  );
}
