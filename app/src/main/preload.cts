// Tell TypeScript to compile this file as CommonJS despite package.json "type": "module"
// This is the standard approach for Electron preload scripts
import { contextBridge, ipcRenderer } from 'electron';

// Build the API object once so it can be exposed under multiple names
const electronApi = {
  // Hotkey scroll events
  onHotkeyScroll: (callback: (section: string, direction: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, section: string, direction: string) =>
      callback(section, direction);
    ipcRenderer.on('hotkey-scroll', handler);
    return () => ipcRenderer.removeListener('hotkey-scroll', handler);
  },

  // Configuration management
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (updates: any) => ipcRenderer.invoke('config:update', updates),
  },

  // Transcription management
  transcription: {
    start: () => ipcRenderer.invoke('transcription:start'),
    stop: () => ipcRenderer.invoke('transcription:stop'),
  },

  // VCam bridge management
  vcam: {
    startBridge: () => ipcRenderer.invoke('vcam:start-bridge'),
    stopBridge: () => ipcRenderer.invoke('vcam:stop-bridge'),
  },

  // Authentication management
  auth: {
    signup: (username: string, email: string, password: string) =>
      ipcRenderer.invoke('auth:signup', username, email, password),
    login: (email: string, password: string) => ipcRenderer.invoke('auth:login', email, password),
    logout: () => ipcRenderer.invoke('auth:logout'),
    changePassword: (currentPassword: string, newPassword: string) =>
      ipcRenderer.invoke('auth:change-password', currentPassword, newPassword),
  },

  // App state management
  appState: {
    get: () => ipcRenderer.invoke('app:get-state'),
    update: (updates: any) => ipcRenderer.invoke('app:update-state', updates),
    addTranscript: (transcript: any) => ipcRenderer.invoke('app:add-transcript', transcript),
    addReplySuggestion: (suggestion: any) =>
      ipcRenderer.invoke('app:add-reply-suggestion', suggestion),
    addCodeSuggestion: (suggestion: any) =>
      ipcRenderer.invoke('app:add-code-suggestion', suggestion),
    clearTranscripts: () => ipcRenderer.invoke('app:clear-transcripts'),
    clearSuggestions: () => ipcRenderer.invoke('app:clear-suggestions'),
  },

  // Listen for pushed app state updates from main
  onAppStateUpdated: (callback: (state: any) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: any) => callback(state);
    ipcRenderer.on('app-state-updated', handler);
    return () => ipcRenderer.removeListener('app-state-updated', handler);
  },

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),

  // Edge resize support
  resizeWindowDelta: (dx: number, dy: number, edge: string) =>
    ipcRenderer.send('window-resize-delta', dx, dy, edge),

  // Stealth control helpers
  setStealth: (isStealth: boolean) => ipcRenderer.send('set-stealth', !!isStealth),
  toggleStealth: () => ipcRenderer.send('window-toggle-stealth'),

  // Opacity toggle helper (renderer UI can call this)
  toggleOpacity: () => ipcRenderer.send('window-toggle-opacity'),

  // Small ping helper to verify preload is loaded and IPC works
  ping: () => ipcRenderer.send('preload-ping'),
  // Informational flag
  isElectron: true,
};

// Expose under canonical and alias names to tolerate consumer differences
try {
  contextBridge.exposeInMainWorld('electronAPI', electronApi);
  contextBridge.exposeInMainWorld('electron', electronApi);
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('preload: exposeInMainWorld failed', e);
}

// eslint-disable-next-line no-console
console.log('preload: electron API exposed');

// Listen for stealth mode changes from main and update body class
ipcRenderer.on('stealth-changed', (_event, isStealth: boolean) => {
  const apply = () => {
    try {
      if (isStealth) {
        document.body.classList.add('stealth');
      } else {
        document.body.classList.remove('stealth');
      }
    } catch (e) {
      console.warn('Failed to update stealth class:', e);
    }
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    apply();
  } else {
    window.addEventListener('DOMContentLoaded', apply, { once: true });
  }
});
