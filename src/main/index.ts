import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc/handlers';
import { trayManager } from './tray/TrayManager';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Initialize tray after window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    trayManager.init(mainWindow!);
  });
}

// Extend app type for isQuitting property
declare module 'electron' {
  interface App {
    isQuitting?: boolean;
  }
}

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit, stay in tray
  }
});
