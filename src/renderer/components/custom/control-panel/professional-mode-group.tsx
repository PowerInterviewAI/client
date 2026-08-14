import { ListChecks, Route } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useProfessionalMode } from '@/hooks/use-professional-mode';
import { Hotkey, HOTKEYS } from '@/lib/hotkeys';
import { cn } from '@/lib/utils';

import { BAR_ACTIVE, BAR_GHOST, BAR_ICON_BUTTON } from './bar';

/**
 * Professional mode toggle.
 *
 * Deliberately takes no `getDisabled`: this is a mid-interview control, like the transcript
 * toggle. It only affects the next suggestion, so leaving it live while the assistant runs
 * cannot corrupt an in-flight stream.
 *
 * Signals on/off twice over - the fill from `BAR_ACTIVE`, and the icon shape (`ListChecks` when
 * on, `Route` when off). The icon swap used to be carrying this alone, because a fill against the
 * `secondary` background the button sat on read as nearly invisible; against the ghost resting
 * state it is the clearer of the two, and the shape still survives a colour-blind reader.
 */
export function ProfessionalModeGroup() {
  const { enabled, toggle } = useProfessionalMode();

  return (
    <div className="flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(BAR_ICON_BUTTON, enabled ? BAR_ACTIVE : BAR_GHOST)}
            aria-pressed={enabled}
            aria-label="Toggle professional mode"
            onClick={toggle}
          >
            {enabled ? (
              <ListChecks className="h-4 w-4" />
            ) : (
              <Route className="h-4 w-4 -scale-y-100" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Professional Mode: {enabled ? 'On' : 'Off'} (
            {HOTKEYS[Hotkey.ToggleProfessionalMode].combo})
          </p>
          <p className="text-xs text-muted-foreground">
            {enabled ? 'Short hints: headline + keyword bullets' : 'Full sentences'}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
