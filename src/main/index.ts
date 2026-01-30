import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc/handlers';
import { trayManager } from './tray/TrayManager';
import { collectionService } from './services/CollectionService';
import { storageService } from './services/StorageService';

let mainWindow: BrowserWindow | null = null;

const isAutoStartMode = process.argv.includes('--auto-start');

async function handleAutoStart() {
  const settings = storageService.getSettings();
  const autoStartCollection = collectionService.getAutoStartCollection();

  if (!autoStartCollection) {
    console.log('No auto-start collection configured');
    return;
  }

  // Wait for configured delay
  await new Promise((resolve) => setTimeout(resolve, settings.autoStartDelay * 1000));

  // Run the collection
  const result = await collectionService.run(autoStartCollection.id);
  console.log('Auto-start result:', result);
}

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
    if (!isQuitting) {
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
declare global {
  namespace NodeJS {
    interface Global {
      isQuitting?: boolean;
    }
  }
}

// Track quitting state
let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
});

app.whenReady().then(async () => {
  registerIpcHandlers();
  createWindow();

  if (isAutoStartMode) {
    mainWindow?.hide(); // Start hidden
    await handleAutoStart();
  }

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
