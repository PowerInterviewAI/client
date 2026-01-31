/// <reference types="vite/client" />

// Extend the Window interface with electronAPI
declare global {
  interface ElectronAPI {
    // Hotkey scroll events
    onHotkeyScroll: (callback: (section: string, direction: string) => void) => () => void;
    
    // Window controls
    minimize: () => void;
    close: () => void;
    
    // Edge resize support
    resizeWindowDelta: (dx: number, dy: number, edge: string) => void;
    
    // Stealth control helpers
    setStealth: (isStealth: boolean) => void;
    toggleStealth: () => void;
    
    // Opacity toggle helper
    toggleOpacity: () => void;
  }

  interface Window {
    electronAPI?: ElectronAPI;
  }
}
