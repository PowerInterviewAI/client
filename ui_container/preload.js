const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	// Hotkey scroll events
	onHotkeyScroll: (callback) => {
		const handler = (event, direction) => callback(direction);
		ipcRenderer.on('hotkey-scroll', handler);
		return () => ipcRenderer.removeListener('hotkey-scroll', handler);
	},
	// Window controls
    minimize: () => ipcRenderer.send('window-minimize'),
    toggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
	// Edge resize support
	resizeWindowDelta: (dx, dy, edge) => ipcRenderer.send('window-resize-delta', dx, dy, edge)
});

