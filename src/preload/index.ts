import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // Will be populated in Task 6
  ping: () => ipcRenderer.invoke('ping'),
});
