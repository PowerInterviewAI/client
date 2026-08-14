import { RefreshCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCombo } from '@/lib/hotkeys';
import { cn } from '@/lib/utils';

import { BAR_GHOST, BAR_ICON_BUTTON } from './control-panel/bar';

export default function ZoomControl() {
  const [zoomPercent, setZoomPercent] = useState(100);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.zoom) return;

    api.zoom
      .getFactor()
      .then((f) => setZoomPercent(Math.round(f * 100)))
      .catch(() => {});

    const cleanup = api.zoom.onChange((p) => setZoomPercent(p));
    return cleanup;
  }, []);

  const handleZoomIn = () => {
    window.electronAPI?.zoom.increase();
  };

  const handleZoomOut = () => {
    window.electronAPI?.zoom.decrease();
  };

  const handleZoomReset = () => {
    window.electronAPI?.zoom.reset();
  };

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleZoomReset}
            aria-label="Reset zoom"
            title="Reset zoom"
            className={cn(
              'h-8 px-2 flex items-center justify-center rounded-lg tabular-nums',
              BAR_GHOST
            )}
          >
            <RefreshCcw className="h-4 w-4" />
            <span className="ml-1 text-xs">{zoomPercent}%</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Reset zoom ({formatCombo('0')})</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleZoomIn}
            aria-label="Zoom in"
            title="Zoom in"
            className={cn(BAR_ICON_BUTTON, BAR_GHOST, 'flex items-center justify-center')}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Zoom in ({formatCombo('=')})</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleZoomOut}
            aria-label="Zoom out"
            title="Zoom out"
            className={cn(BAR_ICON_BUTTON, BAR_GHOST, 'flex items-center justify-center')}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Zoom out ({formatCombo('-')})</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
