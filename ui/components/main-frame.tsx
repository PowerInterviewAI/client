'use client';

import useIsStealthMode from '@/hooks/use-is-stealth-mode';
import Titlebar from './titlebar';
import WindowResizer from './window-resizer';

export default function MainFrame({ children }: { children: React.ReactNode }) {
  const isStealth = useIsStealthMode();
  return (
    <main
      className={`overflow-hidden border-2 ${isStealth ? ' border-blue-500 rounded-xl' : 'rounded-md'} `}
    >
      <div className={`flex flex-col ${isStealth ? 'h-[calc(100vh-4px)]' : 'h-[calc(100vh-4px)]'}`}>
        <Titlebar />
        <div className="flex-1 flex flex-col overflow-auto">{children}</div>
      </div>
      <WindowResizer />
    </main>
  );
}
