const { app, BrowserWindow } = require('electron');
const Store = require('electron-store').default;

const store = new Store();

function createWindow() {
    const savedBounds = store.get('windowBounds') || { width: 800, height: 600 };

    const win = new BrowserWindow({
        title: 'Power Interview',
        x: savedBounds.x,
        y: savedBounds.y,
        width: savedBounds.width,
        height: savedBounds.height,
        webPreferences: {
            preload: `${__dirname}/preload.js`
        }
    });

    // Save window size & position when user closes the window
    win.on('close', () => {
        store.set('windowBounds', win.getBounds());
    });

    win.loadURL('http://localhost:8080');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
