import { ipcMain } from 'electron';
import { App } from '../../shared/types';
import { collectionService } from '../services/CollectionService';
import { storageService } from '../services/StorageService';
import { trayManager } from '../tray/TrayManager';

// Platform-specific service imports
let processService: typeof import('../services/ProcessService.windows').processService;
let autoStartService: typeof import('../services/AutoStartService.windows').autoStartService;
let metricsService: typeof import('../services/MetricsService.windows').metricsService;

if (process.platform === 'darwin') {
  processService = require('../services/ProcessService.darwin').processService;
  autoStartService = require('../services/AutoStartService.darwin').autoStartService;
  metricsService = require('../services/MetricsService.darwin').metricsService;
} else {
  processService = require('../services/ProcessService.windows').processService;
  autoStartService = require('../services/AutoStartService.windows').autoStartService;
  metricsService = require('../services/MetricsService.windows').metricsService;
}

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

  ipcMain.handle('collections:delete', async (_, id: string) => {
    const collection = collectionService.get(id);
    const result = collectionService.delete(id);

    if (result && collection?.isAutoStart) {
      await autoStartService.disable();
    }

    trayManager.updateMenu();
    return result;
  });

  ipcMain.handle('collections:setAutoStart', async (_, id: string) => {
    const result = collectionService.setAutoStart(id);
    await autoStartService.enable(); // Enable Windows Registry entry
    trayManager.updateMenu();
    return result;
  });

  ipcMain.handle('collections:clearAutoStart', async () => {
    collectionService.clearAutoStart();
    await autoStartService.disable(); // Remove Windows Registry entry
    trayManager.updateMenu();
  });

  ipcMain.handle('collections:run', async (_, id: string) => {
    return collectionService.run(id);
  });

  // Metrics
  ipcMain.handle('metrics:getCollection', async (_, id: string) => {
    return metricsService.getCollectionMetrics(id);
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
