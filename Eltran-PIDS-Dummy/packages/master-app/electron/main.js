import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { startApiServer } from './api.js';
import { closeDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        fullscreen: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true,
        },
        backgroundColor: '#0f172a', // Slate-900
        titleBarStyle: 'hidden',
        resizable: true,
    });

    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

    if (app.isPackaged) {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    } else {
        win.loadURL(devServerUrl);
        // win.webContents.openDevTools(); // Open DevTools to help debugging
    }

    win.webContents.on('did-fail-load', () => {
        console.error('Failed to load URL:', devServerUrl);
        win.loadURL(`data:text/html,<html><body><h1>Failed to load: ${devServerUrl}</h1><p>Check if Vite is running.</p></body></html>`);
    });
}

// IPC Handlers
ipcMain.handle('select-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    if (canceled) return null;
    return filePaths[0];
});

app.whenReady().then(async () => {
    // Start the local PIDS API backend (SQLite + Socket.IO)
    await startApiServer();

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

// Cleanup on quit
app.on('before-quit', async (event) => {
    // We prevent default to ensure the DB closes before the app actually exits
    // However, in many Electron versions, quit() is called immediately.
    // A better way is to use a flag or just await if it works in your environment.
    console.log('[PIDS-MAIN] Closing database...');
    await closeDatabase();
});
