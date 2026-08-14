import { List } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useProfessionalMode } from '@/hooks/use-professional-mode';
import { Hotkey, HOTKEYS } from '@/lib/hotkeys';

/**
 * Professional mode toggle.
 *
 * Deliberately takes no `getDisabled`: this is a mid-interview control, like the transcript
 * toggle. It only affects the next suggestion, so leaving it live while the assistant runs
 * cannot corrupt an in-flight stream.
 *
 * Uses a filled `default` variant when on rather than a text-color tint on `secondary`: an
 * icon-color-only change against the light `--secondary` background read as nearly invisible,
 * the same problem the ToggleStealth hotkey chip in status-panel already solves with a filled
 * background.
 */
export function ProfessionalModeGroup() {
  const { enabled, toggle } = useProfessionalMode();

  return (
    <div className="flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={enabled ? 'default' : 'secondary'}
            size="icon"
            className="h-8 w-8 border-none rounded-xl"
            aria-pressed={enabled}
            aria-label="Toggle professional mode"
            onClick={toggle}
          >
            <List className="h-4 w-4" />
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
