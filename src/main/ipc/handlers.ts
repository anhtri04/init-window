import { ipcMain } from 'electron';
import { App } from '../../shared/types';
import { collectionService } from '../services/CollectionService';
import { processService } from '../services/ProcessService.windows';
import { storageService } from '../services/StorageService';

export function registerIpcHandlers(): void {
  // Process scanning
  ipcMain.handle('process:scan', async () => {
    return processService.scanRunningProcesses();
  });

  // Collections CRUD
  ipcMain.handle('collections:list', () => {
    return collectionService.list();
  });

  ipcMain.handle('collections:get', (_, id: string) => {
    return collectionService.get(id);
  });

  ipcMain.handle('collections:create', (_, name: string, apps: App[]) => {
    return collectionService.create(name, apps);
  });

  ipcMain.handle('collections:update', (_, id: string, updates: { name?: string; apps?: App[] }) => {
    return collectionService.update(id, updates);
  });

  ipcMain.handle('collections:delete', (_, id: string) => {
    return collectionService.delete(id);
  });

  ipcMain.handle('collections:setAutoStart', (_, id: string) => {
    return collectionService.setAutoStart(id);
  });

  ipcMain.handle('collections:clearAutoStart', () => {
    collectionService.clearAutoStart();
  });

  ipcMain.handle('collections:run', async (_, id: string) => {
    return collectionService.run(id);
  });

  // Settings
  ipcMain.handle('settings:get', () => {
    return storageService.getSettings();
  });

  ipcMain.handle('settings:update', (_, settings) => {
    storageService.saveSettings(settings);
    return storageService.getSettings();
  });
}
