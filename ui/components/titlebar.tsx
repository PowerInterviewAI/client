'use client';

import useIsStealthMode from '@/hooks/use-is-stealth-mode';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const isStealth = useIsStealthMode();

  useEffect(() => {
    let mounted = true;
    // query initial maximize state
    // eslint-disable-next-line
    // @ts-ignore
    if (typeof window !== 'undefined' && window?.electronAPI?.isMaximized) {
      // eslint-disable-next-line
      // @ts-ignore
      window.electronAPI.isMaximized().then((v: boolean) => {
        if (mounted) setIsMaximized(!!v);
      });
    }

    // Optionally, one could subscribe to maximize/unmaximize events
    return () => {
      mounted = false;
    };
  }, []);

  const handleMinimize = () => {
    // eslint-disable-next-line
    // @ts-ignore
    window.electronAPI?.minimize && window.electronAPI.minimize();
  };
  const handleToggleMaximize = async () => {
    // eslint-disable-next-line
    // @ts-ignore
    window.electronAPI?.toggleMaximize && window.electronAPI.toggleMaximize();
    // update local state after a short delay
    // eslint-disable-next-line
    // @ts-ignore
    const v = await (window.electronAPI?.isMaximized
      ? // eslint-disable-next-line
        // @ts-ignore
        window.electronAPI.isMaximized()
      : Promise.resolve(false));
    setIsMaximized(!!v);
  };
  const handleClose = () => {
    // eslint-disable-next-line
    // @ts-ignore
    window.electronAPI?.close && window.electronAPI.close();
  };

  if (isStealth) return null;

  return (
    // eslint-disable-next-line
    // @ts-ignore
    <div
      id="titlebar"
      // eslint-disable-next-line
      style={{ WebkitAppRegion: 'drag' } as any}
      className="flex items-center gap-3 h-8 px-1 select-none bg-card border-b border-border"
    >
      <div className="flex items-center gap-2">
        <Image src="/favicon.svg" alt="logo" className="h-5 w-5" width={12} height={12} />

        <div
          className="text-sm font-medium"
          // eslint-disable-next-line
          style={{ WebkitAppRegion: 'drag' } as any}
        >
          Power Interview
        </div>
      </div>

      <div
        className="ml-auto flex items-center gap-1"
        // eslint-disable-next-line
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          onClick={handleMinimize}
          aria-label="Minimize"
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted"
          // eslint-disable-next-line
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <button
          onClick={handleToggleMaximize}
          aria-label="Maximize"
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted"
          // eslint-disable-next-line
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          {isMaximized ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect
                x="3"
                y="3"
                width="14"
                height="14"
                rx="1"
                ry="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect
                x="5"
                y="5"
                width="14"
                height="14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        <button
          onClick={handleClose}
          aria-label="Close"
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/50"
          // eslint-disable-next-line
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
