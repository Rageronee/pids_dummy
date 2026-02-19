import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const win = new BrowserWindow({
        width: 640,
        height: 320, // Simulasi P10 Aspect Ratio
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            allowRunningInsecureContent: true,
        },
        backgroundColor: '#000000',
        titleBarStyle: 'hidden',
        resizable: true,
    });

    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5175';

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
