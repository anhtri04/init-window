import { ipcMain } from 'electron';
import { App } from '../../shared/types';
import { collectionService } from '../services/CollectionService';
import { processService } from '../services/ProcessService.windows';
import { storageService } from '../services/StorageService';
import { trayManager } from '../tray/TrayManager';
import { autoStartService } from '../services/AutoStartService.windows';

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
    const result = collectionService.create(name, apps);
    trayManager.updateMenu();
    return result;
  });

  ipcMain.handle('collections:update', (_, id: string, updates: { name?: string; apps?: App[] }) => {
    const result = collectionService.update(id, updates);
    trayManager.updateMenu();
    return result;
  });

  ipcMain.handle('collections:delete', (_, id: string) => {
    const result = collectionService.delete(id);
    trayManager.updateMenu();
    return result;
  });

  ipcMain.handle('collections:setAutoStart', (_, id: string) => {
    const result = collectionService.setAutoStart(id);
    trayManager.updateMenu();
    return result;
  });

  ipcMain.handle('collections:clearAutoStart', () => {
    collectionService.clearAutoStart();
    trayManager.updateMenu();
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

  // Auto-start
  ipcMain.handle('autoStart:enable', async () => {
    await autoStartService.enable();
  });

  ipcMain.handle('autoStart:disable', async () => {
    await autoStartService.disable();
  });

  ipcMain.handle('autoStart:isEnabled', async () => {
    return autoStartService.isEnabled();
  });
}
