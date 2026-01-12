'use client';

import { HOTKEYS } from '@/lib/hotkeys';

export default function HotkeysPanel() {
  return (
    <div
      id="hotkeys-panel"
      className="flex items-center text-muted-foreground bg-white dark:bg-black rounded-md p-1"
    >
      <div className="flex gap-x-2 gap-y-1 flex-wrap">
        {HOTKEYS.map(([k, d]) => (
          <div key={String(k)} className="flex items-center gap-1">
            <div className="px-1 py-0.5 rounded bg-muted text-[11px] font-semibold">{k}</div>
            <div className="text-[11px] font-semibold">{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
