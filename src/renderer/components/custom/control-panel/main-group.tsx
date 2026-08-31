import { ChevronDown, Mic } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppState } from '@/hooks/use-app-state';
import { cn } from '@/lib/utils';
import { RunningState } from '@/types/app-state';

interface MainGroupProps {
  stateConfig: {
    onClick: () => void;
    className: string;
    icon: React.ReactNode;
    label: string;
  };
  getDisabled: (state: RunningState, disableOnRunning?: boolean) => boolean;
  /** Which session `onStartDefault` launches - whichever was last actually started. */
  defaultMode: 'live' | 'mock';
  /** The primary button's own action while idle: start `defaultMode` directly, no menu involved. */
  onStartDefault: () => void;
  /** Opens the mock interview's setup dialog. Only offered while nothing is running. */
  onStartMockInterview: () => void;
}

/**
 * Start/Stop - the one filled control on the bar, and the only one carrying a visible label. It is
 * the most consequential action in the app and it changes what every other control means, so it
 * gets the row's whole contrast budget rather than sharing a grey pill with the settings.
 *
 * Fixed width rather than auto: the label changes with the running state, and an auto-width
 * primary would shift the rest of the bar sideways at the exact moment the user is watching it.
 */
export function MainGroup({
  stateConfig,
  getDisabled,
  defaultMode,
  onStartDefault,
  onStartMockInterview,
}: MainGroupProps) {
  const { runningState } = useAppState();

  const { onClick, className, icon, label } = stateConfig;
  const isIdle = runningState === RunningState.Idle;

  const handleStartStopClick = async () => {
    try {
      // Call the provided click handler. It may be sync or return a Promise.
      // eslint-disable-next-line
      const res = onClick() as any;

      // If we're currently running, the user is stopping - wait for any async stop
      // action to complete before asking about export.
      if (runningState === RunningState.Running) {
        if (res && typeof res.then === 'function') {
          try {
            await res;
          } catch (e) {
            // ignore errors from the stop action here; still show export prompt
            console.error('Error awaiting stop action', e);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Idle-only counterpart to handleStartStopClick, for the half of the split button that has no
  // running-state machine of its own to wait on - starting either session is either a dialog
  // opening (mock, synchronous) or handleStartClick's own headphone-notice flow (live, which
  // reports its own errors), so there is nothing here for a caller to await.
  const handlePrimaryClick = () => {
    try {
      onStartDefault();
    } catch (err) {
      console.error(err);
    }
  };

  const primaryIcon = defaultMode === 'mock' ? <Mic className="h-3.5 w-3.5" /> : icon;

  // Idle only: the dropdown offers a choice of what to start, and once something is running the
  // only meaningful action left is Stop - a chevron with nothing behind it would just be visual
  // noise on the one control the candidate is most likely to reach for under pressure.
  if (!isIdle) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleStartStopClick}
            size="sm"
            className={cn(
              'h-8 w-24 gap-1.5 rounded-lg text-xs font-semibold cursor-pointer',
              className
            )}
            disabled={getDisabled(runningState, false)}
          >
            {icon}
            {label}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Start/Stop Assistant - {label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center h-8 rounded-lg" role="group" aria-label="Start">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handlePrimaryClick}
            size="sm"
            className={cn(
              'h-8 w-24 gap-1.5 rounded-r-none rounded-l-lg text-xs font-semibold cursor-pointer',
              className
            )}
            disabled={getDisabled(runningState, false)}
          >
            {primaryIcon}
            {label}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{defaultMode === 'mock' ? 'Start a mock interview' : 'Start the live assistant'}</p>
          <p className="text-xs text-muted-foreground">Last session's mode - see the menu for the other one</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenu modal={false}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                className={cn('h-8 w-5 rounded-l-none rounded-r-lg border-l border-white/20 px-0', className)}
                disabled={getDisabled(runningState, false)}
                aria-label="More ways to start"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>More ways to start</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" side="top">
          <DropdownMenuItem onClick={handleStartStopClick}>
            {icon}
            <span className="ml-2">Start live assistant</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onStartMockInterview}>
            <Mic className="h-3.5 w-3.5" />
            <span className="ml-2">Start mock interview</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
