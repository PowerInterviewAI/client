import { HOTKEYS } from '@/lib/hotkeys';
import { RunningState } from '@/types/app-state';

import { RunningIndicator } from './running-indicator';

type Props = {
  runningState?: RunningState;
};

export default function HotkeysPanel({ runningState = RunningState.IDLE }: Props) {
  return (
    <div
      id="hotkeys-panel"
      className="flex items-center justify-between text-muted-foreground bg-white dark:bg-black rounded-md p-2"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <RunningIndicator runningState={runningState} compact />
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
