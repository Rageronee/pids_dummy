/** /selector-app/electron/main.js — untuk mengubah: komponen PIDS; fungsi utama: main */

import { app, BrowserWindow, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { startApiServer, stopApiServer } from "../../master-app/electron/api.js";
import { closeDatabase } from "../../master-app/electron/database.js";

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
    backgroundColor: "#0f172a",
    titleBarStyle: "hidden",
    resizable: true,
  });

  const devServerUrl =
    process.env.VITE_DEV_SERVER_URL || "http://localhost:5174";

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  } else {
    win.loadURL(devServerUrl);
  }

  win.webContents.on("did-fail-load", () => {
    console.error("Failed to load URL:", devServerUrl);
    win.loadURL(
      `data:text/html,<html><body><h1>Failed to load: ${devServerUrl}</h1><p>Check if Vite is running.</p></body></html>`,
    );
  });
}

app.whenReady().then(async () => {
  try {
    await startApiServer();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (err) {
    console.error("[PIDS-MAIN] Failed to start backend:", err);
    dialog.showErrorBox(
      "Startup Error",
      "Backend failed to start. Check database connection and logs.",
    );
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

let isShuttingDown = false;
app.on("before-quit", async (event) => {
  if (isShuttingDown) return;
  event.preventDefault();
  isShuttingDown = true;
  console.log("[PIDS-MAIN] Closing backend...");
  try {
    await stopApiServer();
    await closeDatabase();
  } finally {
    app.exit(0);
  }
});
