export {};

declare global {
  interface Window {
    electronAPI?: {
      resizeWindowDelta?: (dx: number, dy: number, edge: string) => void;
      onHotkeyScroll?: (
        cb: (section: string, direction: 'up' | 'down') => void,
      ) => void | (() => void);
      toggleStealth?: () => void;
      minimize?: () => void;
      close?: () => void;
    };
  }
}
