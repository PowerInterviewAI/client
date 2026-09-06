import { BookOpen, CreditCard, Mic, Play, SettingsIcon, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { MockInterviewSetupDialog } from '@/components/custom/mock-interview-setup-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/hooks/use-app-state';
import { useConfigStore } from '@/hooks/use-config-store';
import type { MockInterviewSetup } from '@/types/mock-interview';

interface LaunchCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

/**
 * One of the two ways to start. A card rather than a button because the choice between them is
 * the whole point of this screen, and a title alone does not say which one a first-time user
 * wants - the description under it does.
 */
function LaunchCard({ icon, title, description, onClick }: LaunchCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="cursor-pointer outline-none transition-colors hover:border-primary focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

/**
 * The app's front door: the two things you can start, and the three places you can go.
 *
 * `/` used to redirect straight into the control console, which is dense, unlabelled and assumes
 * you already know what the app does. Everything reachable from here is named in the words a
 * candidate would use, not the ones the codebase uses.
 *
 * Neither launch button starts a session from this page. Live hands off to `/main`, which owns
 * the whole start sequence - the microphone checks, the headphone notice, the macOS permission
 * gate and the save-history guard - and mock hands off to `/mock-interview` with the setup this
 * page's dialog collected. Duplicating either flow here is how the two would drift apart.
 */
export default function HomePage() {
  const navigate = useNavigate();
  const { appState } = useAppState();
  const { config, isLoading: configLoading, updateConfig } = useConfigStore();

  const [mockSetupOpen, setMockSetupOpen] = useState(false);

  const email = config?.email;
  const credits = appState?.credits;
  // appState starts null before the first IPC round-trip resolves, and the config arrives over a
  // second one - both need to settle before "no data" is trustworthy.
  const accountReady = !configLoading && config !== undefined && appState !== null;
  const firstName =
    appState?.interviewConfig?.fullName?.trim().split(' ')[0] || email?.split('@')[0];

  const handleStartLive = () => {
    // `/main`'s control panel runs the start sequence on arrival. Handed through router state
    // rather than started here so there is exactly one implementation of it.
    navigate('/main', { state: { autoStartLive: true } });
  };

  const handleMockInterviewStart = async (setup: MockInterviewSetup) => {
    void updateConfig({ lastSessionMode: 'mock' }).catch((e) =>
      console.error('Failed to persist last session mode', e)
    );
    setMockSetupOpen(false);
    navigate('/mock-interview', { state: { pendingSetup: setup } });
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto w-full max-w-xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">
            {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Practise against an AI interviewer, or get live help during a real call.
          </p>
        </div>

        <div className="mb-6 space-y-3">
          <LaunchCard
            icon={<Mic className="h-5 w-5" aria-hidden="true" />}
            title="Start mock interview"
            description="The AI asks, you answer out loud, and you get a scored report at the end."
            onClick={() => setMockSetupOpen(true)}
          />
          <LaunchCard
            icon={<Play className="h-5 w-5" aria-hidden="true" />}
            title="Start live assistant"
            description="Transcribes your real interview and suggests answers as it happens."
            onClick={handleStartLive}
          />
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <Button variant="outline" className="justify-start" onClick={() => navigate('/account')}>
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Account
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => navigate('/configuration')}
          >
            <SettingsIcon className="h-4 w-4" aria-hidden="true" />
            Configuration
          </Button>
        </div>

        <Card className="mb-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Account</p>
              <p className="truncate text-sm font-medium">
                {accountReady ? (email ?? 'Not signed in') : 'Loading...'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Credits</p>
              <p className="text-sm font-medium">
                {accountReady ? (credits ?? 'Unavailable') : 'Loading...'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => navigate('/payment')}
            >
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Buy Credits
            </Button>
          </div>
        </Card>

        <Button variant="ghost" size="sm" onClick={() => navigate('/documentation')}>
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Documentation
        </Button>
      </div>

      <MockInterviewSetupDialog
        open={mockSetupOpen}
        onOpenChange={setMockSetupOpen}
        onStart={handleMockInterviewStart}
      />
    </div>
  );
}
