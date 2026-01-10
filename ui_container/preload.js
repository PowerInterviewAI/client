const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	onHotkeyScroll: (callback) => {
		const handler = (event, direction) => callback(direction);
		ipcRenderer.on('hotkey-scroll', handler);
		return () => ipcRenderer.removeListener('hotkey-scroll', handler);
	}
});

