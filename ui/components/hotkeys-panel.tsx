'use client';

export default function HotkeysPanel() {
  const items = [
    ['Ctrl+Alt+S', 'Toggle stealth mode'],
    ['Ctrl+Alt+1..5', 'Move window / corners / center'],
    ['Ctrl+Alt+M', 'Toggle maximize'],
    ['Ctrl+Alt+N', 'Minimize'],
    ['Ctrl+Alt+R', 'Restore window'],
    ['Ctrl+Alt+Arrow', 'Move window by arrow'],
    ['Ctrl+Shift+Arrow', 'Resize window by arrow'],
    ['Ctrl+Shift+PageUp/Down', 'Adjust opacity'],
    ['Ctrl+Alt+PageUp/Down', 'Scroll suggestions up/down'],
  ];

  return (
    <div className="flex items-center text-xs text-muted-foreground bg-white dark:bg-black rounded-md p-1">
      <div className="flex gap-x-2 gap-y-1 flex-wrap">
        {items.map(([k, d]) => (
          <div key={String(k)} className="flex items-center gap-1">
            <div className="px-2 py-0.5 rounded bg-muted text-[11px] font-bold">{k}</div>
            <div className="font-bold text-[11px] text-muted-foreground">{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
