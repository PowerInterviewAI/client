'use client';

import { useEffect, useState } from 'react';

export default function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let mounted = true;
    // query initial maximize state
    // @ts-ignore
    if (typeof window !== 'undefined' && window?.electronAPI?.isMaximized) {
      // @ts-ignore
      window.electronAPI.isMaximized().then((v: boolean) => { if (mounted) setIsMaximized(!!v); });
    }

    // Optionally, one could subscribe to maximize/unmaximize events
    return () => { mounted = false; };
  }, []);

  const handleMinimize = () => {
    // @ts-ignore
    window.electronAPI?.minimize && window.electronAPI.minimize();
  };
  const handleToggleMaximize = async () => {
    // @ts-ignore
    window.electronAPI?.toggleMaximize && window.electronAPI.toggleMaximize();
    // update local state after a short delay
    // @ts-ignore
    const v = await (window.electronAPI?.isMaximized ? window.electronAPI.isMaximized() : Promise.resolve(false));
    setIsMaximized(!!v);
  };
  const handleClose = () => {
    // @ts-ignore
    window.electronAPI?.close && window.electronAPI.close();
  };

  return (
    // @ts-ignore
    <div
      style={{ WebkitAppRegion: 'drag' } as any}
      className="fixed top-0 left-0 right-0 z-20 flex items-center gap-3 h-8 px-3 select-none bg-card border-b border-border"
    >
      <div className="flex items-center gap-2">
        <div className="text-sm font-medium" style={{ WebkitAppRegion: 'drag' } as any}>
          Power Interview
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={handleMinimize}
          aria-label="Minimize"
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <button
          onClick={handleToggleMaximize}
          aria-label="Maximize"
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted"
          style={{ WebkitAppRegion: 'no-drag' } as any} 
        >
          {isMaximized ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="14" height="14" rx="1" ry="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="5" y="5" width="14" height="14" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </button>

        <button
          onClick={handleClose}
          aria-label="Close"
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}
