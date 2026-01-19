'use client';

import { HOTKEYS } from '@/lib/hotkeys';
import { RunningState } from '@/types/appState';

type IndicatorConfig = {
  dotClass: string;
  label: string;
};

type Props = {
  runningState?: RunningState;
};

export default function HotkeysPanel({ runningState = RunningState.IDLE }: Props) {
  const indicatorConfig: Record<RunningState, IndicatorConfig> = {
    [RunningState.IDLE]: {
      dotClass: 'bg-muted-foreground',
      label: 'Idle',
    },
    [RunningState.STARTING]: {
      dotClass: 'bg-primary animate-pulse',
      label: 'Starting',
    },
    [RunningState.RUNNING]: {
      dotClass: 'bg-destructive animate-pulse',
      label: 'Running',
    },
    [RunningState.STOPPING]: {
      dotClass: 'bg-destructive animate-pulse',
      label: 'Stopping',
    },
    [RunningState.STOPPED]: {
      dotClass: 'bg-muted-foreground',
      label: 'Stopped',
    },
  };
  const { dotClass: indicatorDotClass, label: indicatorLabel } = indicatorConfig[runningState];

  return (
    <div
      id="hotkeys-panel"
      className="flex items-center justify-between text-muted-foreground bg-white dark:bg-black rounded-md p-2"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-3 w-3 rounded-full ${indicatorDotClass}`} />
        </div>
        <div className="hidden sm:flex gap-x-2 gap-y-1 flex-wrap">
          {HOTKEYS.map(([k, d]) => (
            <div key={String(k)} className="flex items-center gap-2">
              <div className="px-1 py-0.5 rounded bg-muted text-[11px] font-semibold">{k}</div>
              <div className="text-[11px] font-semibold text-foreground">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
