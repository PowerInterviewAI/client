import { useState } from 'react';

import faviconSvg from '/favicon.svg';
import DocumentationDialog from '@/components/custom/documentation-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useIsStealthMode from '@/hooks/use-is-stealth-mode';

export default function Titlebar() {
  const isStealth = useIsStealthMode();

  const handleMinimize = () => {
    const api = window.electronAPI;
    if (api?.minimize) api.minimize();
  };
  const handleClose = () => {
    const api = window.electronAPI;
    if (api?.close) api.close();
  };

  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const handleToggleStealth = () => {
    // Prefer delegating to main process window-controls via preload
    if (typeof window !== 'undefined' && window?.electronAPI?.toggleStealth) {
      window.electronAPI.toggleStealth();
      return;
    }
  };

  if (isStealth) return null;

  return (
    <>
      <div
        id="titlebar"
        // eslint-disable-next-line
        style={{ WebkitAppRegion: 'drag' } as any}
        className="flex items-center gap-3 h-9 px-1 select-none bg-card border-b border-border"
      >
        <div className="flex items-center gap-2 px-1">
          <img src={faviconSvg} alt="logo" className="h-5 w-5" />

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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsDocsOpen(true)}
                aria-label="Documentation"
                className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted"
                // eslint-disable-next-line
                style={{ WebkitAppRegion: 'no-drag' } as any}
              >
                ?
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Documentation</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleToggleStealth}
                aria-label="Toggle stealth mode"
                title="Toggle stealth mode"
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
                  <path
                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle stealth</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent>
              <p>Minimize</p>
            </TooltipContent>
          </Tooltip>

          {/* Maximize button removed by request */}

          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent>
              <p>Close</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <DocumentationDialog open={isDocsOpen} onOpenChange={setIsDocsOpen} />
    </>
  );
}
