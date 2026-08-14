import { Button } from '@/components/ui/button';
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
}

/**
 * Start/Stop - the one filled control on the bar, and the only one carrying a visible label. It is
 * the most consequential action in the app and it changes what every other control means, so it
 * gets the row's whole contrast budget rather than sharing a grey pill with the settings.
 *
 * Fixed width rather than auto: the label changes with the running state, and an auto-width
 * primary would shift the rest of the bar sideways at the exact moment the user is watching it.
 */
export function MainGroup({ stateConfig, getDisabled }: MainGroupProps) {
  const { runningState } = useAppState();

  const { onClick, className, icon, label } = stateConfig;

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
