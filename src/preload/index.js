"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electron', {
    // Will be populated in Task 6
    ping: () => electron_1.ipcRenderer.invoke('ping'),
});
