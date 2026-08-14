import { Captions, CaptionsOff, Keyboard, ListChecks, Route } from 'lucide-react';

import CreditsDisplay from '@/components/custom/credits-display';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useProfessionalMode } from '@/hooks/use-professional-mode';
import { useTranscriptPanel } from '@/hooks/use-transcript-panel';
import { Hotkey, HOTKEY_GROUPS, HOTKEYS } from '@/lib/hotkeys';
import { cn } from '@/lib/utils';
import { RunningState, UserRole } from '@/types/app-state';

import { RunningIndicator } from './running-indicator';

interface StatusPanelProps {
  runningState: RunningState;
  credits: number;
  llmModel: string;
  userRole?: UserRole;
}

// Filled background rather than a text-color tint: a tint against this panel's muted-foreground
// default read as nearly invisible, the same problem the control-panel toggle button had.
const badgeClass = (active: boolean) =>
  cn(
    'h-6 flex items-center gap-1 rounded px-2 text-xs font-medium',
    active ? 'bg-primary/80 text-primary-foreground' : 'text-muted-foreground'
  );

export default function StatusPanel({
  runningState,
  llmModel,
  credits,
  userRole,
}: StatusPanelProps) {
  // calculate and formatting handled by CreditsDisplay component
  const { enabled: professionalMode } = useProfessionalMode();
  const { visible: transcriptVisible } = useTranscriptPanel();

  return (
    <div id="status-panel" className="flex items-center justify-between text-muted-foreground p-1">
      <RunningIndicator runningState={runningState} />
      <CreditsDisplay credits={credits} llmModel={llmModel} userRole={userRole} className="ml-2" />
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('ml-2', badgeClass(professionalMode))}>
            {professionalMode ? (
              <ListChecks className="h-3.5 w-3.5" />
            ) : (
              <Route className="h-3.5 w-3.5 -scale-y-100" />
            )}
            {professionalMode ? 'Professional' : 'Normal'}
          </div>
        </TooltipTrigger>
        <TooltipContent sideOffset={4}>
          <p>
            Professional Mode: {professionalMode ? 'On' : 'Off'} (
            {HOTKEYS[Hotkey.ToggleProfessionalMode].combo})
          </p>
          <p className="text-xs text-muted-foreground">
            {professionalMode ? 'Short hints: headline + keyword bullets' : 'Full sentences'}
          </p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('ml-1', badgeClass(transcriptVisible))}>
            {transcriptVisible ? (
              <Captions className="h-3.5 w-3.5" />
            ) : (
              <CaptionsOff className="h-3.5 w-3.5" />
            )}
            Transcript
          </div>
        </TooltipTrigger>
        <TooltipContent sideOffset={4}>
          <p>
            Transcription: {transcriptVisible ? 'Shown' : 'Hidden'} (
            {HOTKEYS[Hotkey.ToggleTranscript].combo})
          </p>
        </TooltipContent>
      </Tooltip>
      <div className="flex-1" />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="h-6 flex items-center justify-center rounded hover:bg-muted text-xs font-medium gap-1 px-2"
            aria-label="Hotkeys"
            title="Show keyboard shortcuts"
          >
            <Keyboard className="h-4 w-4" /> Show Hotkeys
          </button>
        </TooltipTrigger>
        <TooltipContent sideOffset={4} className="w-2xl rounded-md p-2">
          <div className="space-y-2">
            {HOTKEY_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="text-[10px] font-semibold text-foreground mb-1 uppercase">
                  {group.label}
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {group.keys.map((hk) => {
                    const info = HOTKEYS[hk];
                    return (
                      <div key={hk} className="flex items-center gap-1">
                        <div
                          className={cn(
                            'px-1 py-0.5 rounded text-[11px] font-semibold',
                            hk === Hotkey.StopAll
                              ? 'bg-destructive/80 text-destructive-foreground'
                              : hk === Hotkey.ToggleStealth
                                ? 'bg-primary/80 text-primary-foreground'
                                : 'bg-muted text-foreground'
                          )}
                        >
                          {info.combo}
                        </div>
                        <div className="text-[11px] font-semibold text-foreground">
                          {info.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
