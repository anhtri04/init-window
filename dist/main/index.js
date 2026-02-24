"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const handlers_1 = require("./ipc/handlers");
const TrayManager_1 = require("./tray/TrayManager");
const CollectionService_1 = require("./services/CollectionService");
const StorageService_1 = require("./services/StorageService");
let mainWindow = null;
const isAutoStartMode = process.argv.includes('--auto-start');
async function handleAutoStart() {
    const settings = StorageService_1.storageService.getSettings();
    const autoStartCollection = CollectionService_1.collectionService.getAutoStartCollection();
    if (!autoStartCollection) {
        console.log('No auto-start collection configured');
        return;
    }
    // Wait for configured delay
    await new Promise((resolve) => setTimeout(resolve, settings.autoStartDelay * 1000));
    // Run the collection
    const result = await CollectionService_1.collectionService.run(autoStartCollection.id);
    console.log('Auto-start result:', result);
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 400,
        height: 600,
        resizable: false,
        icon: path_1.default.join(electron_1.app.getAppPath(), 'assets', 'icon.ico'),
        webPreferences: {
            preload: path_1.default.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false, // Allow loading local file:// images
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
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../renderer/index.html'));
    }
    // Initialize tray after window is ready
    mainWindow.webContents.on('did-finish-load', () => {
        TrayManager_1.trayManager.init(mainWindow);
    });
}
// Track quitting state
let isQuitting = false;
electron_1.app.on('before-quit', () => {
    isQuitting = true;
});
electron_1.app.whenReady().then(async () => {
    (0, handlers_1.registerIpcHandlers)();
    createWindow();
    if (isAutoStartMode) {
        mainWindow?.hide(); // Start hidden
        await handleAutoStart();
    }
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Don't quit, stay in tray
    }
});
