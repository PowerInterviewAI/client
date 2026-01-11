'use client';

import { useCallback } from 'react';

const edges = [
  'left',
  'right',
  'top',
  'bottom',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

function cursorForEdge(edge: string) {
  switch (edge) {
    case 'left':
    case 'right':
      return 'ew-resize';
    case 'top':
    case 'bottom':
      return 'ns-resize';
    case 'top-left':
    case 'bottom-right':
      return 'nwse-resize';
    case 'top-right':
    case 'bottom-left':
      return 'nesw-resize';
    default:
      return 'default';
  }
}

export default function WindowResizer() {
  const startDrag = useCallback((e: React.MouseEvent, edge: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    let lastX = startX;
    let lastY = startY;

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      try {
        // @ts-ignore
        window.electronAPI &&
          // @ts-ignore
          window.electronAPI.resizeWindowDelta &&
          // @ts-ignore
          window.electronAPI.resizeWindowDelta(dx, dy, edge);
      } catch (err) {}
    }

    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mouseleave', onUp as any);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mouseleave', onUp as any);
  }, []);

  // render selected edge grips (only right/bottom/bottom-right)
  return (
    // @ts-ignore
    <div className="pointer-events-none fixed inset-0 z-9999">
      {/* Edges: keep only right and bottom */}
      <div
        onMouseDown={(e) => startDrag(e, 'right')}
        style={{ cursor: cursorForEdge('right'), WebkitAppRegion: 'no-drag' } as any}
        className="pointer-events-auto absolute top-0 bottom-0 right-0 w-4"
      />
      <div
        onMouseDown={(e) => startDrag(e, 'bottom')}
        style={{ cursor: cursorForEdge('bottom'), WebkitAppRegion: 'no-drag' } as any}
        className="pointer-events-auto absolute left-0 right-0 bottom-0 h-4"
      />

      {/* Corner: keep only bottom-right */}
      <div
        onMouseDown={(e) => startDrag(e, 'bottom-right')}
        style={{ cursor: cursorForEdge('bottom-right'), WebkitAppRegion: 'no-drag' } as any}
        className="pointer-events-auto absolute bottom-0 right-0 w-8 h-8"
      />
    </div>
  );
}
