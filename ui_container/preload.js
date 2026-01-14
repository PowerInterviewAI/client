const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Hotkey scroll events
  onHotkeyScroll: callback => {
    const handler = (event, direction) => callback(direction);
    ipcRenderer.on('hotkey-scroll', handler);
    return () => ipcRenderer.removeListener('hotkey-scroll', handler);
  },
  // General hotkey actions (e.g. capture-screenshot, set-prompt, submit)
  onHotkeyAction: callback => {
    const handler = (event, action) => callback(action);
    ipcRenderer.on('hotkey-action', handler);
    return () => ipcRenderer.removeListener('hotkey-action', handler);
  },
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  // Edge resize support
  resizeWindowDelta: (dx, dy, edge) => ipcRenderer.send('window-resize-delta', dx, dy, edge),
  // Stealth control helpers
  setStealth: isStealth => ipcRenderer.send('set-stealth', !!isStealth),
  toggleStealth: () => ipcRenderer.send('window-toggle-stealth'),
  // Opacity toggle helper (renderer UI can call this)
  toggleOpacity: () => ipcRenderer.send('window-toggle-opacity'),
});

// Listen for stealth mode changes from main and update body class
ipcRenderer.on('stealth-changed', (event, isStealth) => {
  const apply = () => {
    try {
      if (isStealth) document.body.classList.add('stealth');
      else document.body.classList.remove('stealth');
    } catch (e) {}
  };
  if (document.readyState === 'complete' || document.readyState === 'interactive') apply();
  else window.addEventListener('DOMContentLoaded', apply, { once: true });
});
