import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const win = new BrowserWindow({
        width: 1440,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
        },
        backgroundColor: '#0a0f1e',
        titleBarStyle: 'hidden',
        resizable: true,
        title: 'PIDS Command Center',
    });

    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5176';

    if (app.isPackaged) {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
        win.loadURL(devServerUrl);
    }

    win.webContents.on('did-fail-load', () => {
        win.loadURL(`data:text/html,<html><body><h1>Failed: ${devServerUrl}</h1><p>Check if Vite is running on port 5176.</p></body></html>`);
    });
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
