"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electronAPI = {
    // Process
    scanProcesses: () => electron_1.ipcRenderer.invoke('process:scan'),
    // Collections
    getCollections: () => electron_1.ipcRenderer.invoke('collections:list'),
    getCollection: (id) => electron_1.ipcRenderer.invoke('collections:get', id),
    createCollection: (name, apps) => electron_1.ipcRenderer.invoke('collections:create', name, apps),
    updateCollection: (id, updates) => electron_1.ipcRenderer.invoke('collections:update', id, updates),
    deleteCollection: (id) => electron_1.ipcRenderer.invoke('collections:delete', id),
    setAutoStart: (id) => electron_1.ipcRenderer.invoke('collections:setAutoStart', id),
    clearAutoStart: () => electron_1.ipcRenderer.invoke('collections:clearAutoStart'),
    runCollection: (id) => electron_1.ipcRenderer.invoke('collections:run', id),
    // Settings
    getSettings: () => electron_1.ipcRenderer.invoke('settings:get'),
    updateSettings: (settings) => electron_1.ipcRenderer.invoke('settings:update', settings),
    // Auto-start
    enableAutoStart: () => electron_1.ipcRenderer.invoke('autoStart:enable'),
    disableAutoStart: () => electron_1.ipcRenderer.invoke('autoStart:disable'),
    isAutoStartEnabled: () => electron_1.ipcRenderer.invoke('autoStart:isEnabled'),
};
electron_1.contextBridge.exposeInMainWorld('electron', electronAPI);
