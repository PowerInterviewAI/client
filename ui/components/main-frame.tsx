'use client';

import useIsStealthMode from '@/hooks/use-is-stealth-mode';
import Titlebar from './titlebar';
import WindowResizer from './window-resizer';

export default function MainFrame({ children }: { children: React.ReactNode }) {
  const isStealthMode = useIsStealthMode();
  return (
    <div className={`overflow-hidden ${isStealthMode ? 'rounded-xl' : ''}  border shadow-2xl`}>
      <div className="flex flex-col h-[calc(100vh-2px)]">
        <Titlebar />
        <div className="flex-1 flex flex-col overflow-auto">{children}</div>
      </div>
      <WindowResizer />
    </div>
  );
}
