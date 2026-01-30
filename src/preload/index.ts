import { contextBridge, ipcRenderer } from 'electron';
import { App, Collection, AppSettings, RunResult } from '../shared/types';

const electronAPI = {
  // Process
  scanProcesses: (): Promise<App[]> =>
    ipcRenderer.invoke('process:scan'),

  // Collections
  getCollections: (): Promise<Collection[]> =>
    ipcRenderer.invoke('collections:list'),

  getCollection: (id: string): Promise<Collection | undefined> =>
    ipcRenderer.invoke('collections:get', id),

  createCollection: (name: string, apps: App[]): Promise<Collection> =>
    ipcRenderer.invoke('collections:create', name, apps),

  updateCollection: (id: string, updates: { name?: string; apps?: App[] }): Promise<Collection | null> =>
    ipcRenderer.invoke('collections:update', id, updates),

  deleteCollection: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('collections:delete', id),

  setAutoStart: (id: string): Promise<Collection | null> =>
    ipcRenderer.invoke('collections:setAutoStart', id),

  clearAutoStart: (): Promise<void> =>
    ipcRenderer.invoke('collections:clearAutoStart'),

  runCollection: (id: string): Promise<RunResult> =>
    ipcRenderer.invoke('collections:run', id),

  // Settings
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:get'),

  updateSettings: (settings: AppSettings): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:update', settings),

  // Auto-start
  enableAutoStart: (): Promise<void> =>
    ipcRenderer.invoke('autoStart:enable'),

  disableAutoStart: (): Promise<void> =>
    ipcRenderer.invoke('autoStart:disable'),

  isAutoStartEnabled: (): Promise<boolean> =>
    ipcRenderer.invoke('autoStart:isEnabled'),
};

contextBridge.exposeInMainWorld('electron', electronAPI);

export type ElectronAPI = typeof electronAPI;
