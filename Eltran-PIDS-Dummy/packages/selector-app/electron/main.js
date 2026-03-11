import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 480, // Raspberry Pi Touchscreen size
        fullscreen: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
        },
        backgroundColor: '#0f172a',
        titleBarStyle: 'hidden',
        resizable: true,
    });

    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5174';

    if (app.isPackaged) {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
        win.loadURL(devServerUrl);
        // win.webContents.openDevTools();
    }

    win.webContents.on('did-fail-load', () => {
        console.error('Failed to load URL:', devServerUrl);
        win.loadURL(`data:text/html,<html><body><h1>Failed to load: ${devServerUrl}</h1><p>Check if Vite is running.</p></body></html>`);
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
