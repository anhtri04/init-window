# Init Window Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Windows desktop app that captures running applications and launches them as collections with one click.

**Architecture:** Electron app with React/Tailwind renderer, platform-abstracted services in main process, IPC for communication, electron-store for persistence.

**Tech Stack:** Electron, React, Tailwind CSS, TypeScript, electron-store, winreg

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `electron-builder.json`
- Create: `src/main/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/index.tsx`
- Create: `src/renderer/index.css`
- Create: `src/preload/index.ts`

**Step 1: Initialize npm project**

Run:
```bash
npm init -y
```

**Step 2: Install Electron and build tools**

Run:
```bash
npm install --save-dev electron electron-builder typescript ts-node concurrently wait-on
```

**Step 3: Install React and Tailwind**

Run:
```bash
npm install react react-dom
npm install --save-dev @types/react @types/react-dom tailwindcss postcss autoprefixer
```

**Step 4: Install runtime dependencies**

Run:
```bash
npm install electron-store uuid
npm install --save-dev @types/uuid
```

**Step 5: Create package.json scripts**

Update `package.json`:
```json
{
  "name": "init-window",
  "version": "1.0.0",
  "description": "Automate workspace setup with one click",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"wait-on http://localhost:5173 && npm run dev:main\"",
    "dev:main": "electron .",
    "dev:renderer": "vite",
    "build": "npm run build:renderer && npm run build:main",
    "build:main": "tsc -p tsconfig.main.json",
    "build:renderer": "vite build",
    "dist": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.initwindow.app",
    "productName": "Init Window",
    "directories": {
      "output": "release"
    },
    "win": {
      "target": "nsis"
    }
  }
}
```

**Step 6: Install Vite for React dev server**

Run:
```bash
npm install --save-dev vite @vitejs/plugin-react
```

**Step 7: Create vite.config.ts**

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.join(__dirname, 'src/renderer'),
  base: './',
  build: {
    outDir: path.join(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
```

**Step 8: Create tsconfig.json (base)**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "jsx": "react-jsx"
  }
}
```

**Step 9: Create tsconfig.main.json**

Create `tsconfig.main.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "dist/main",
    "rootDir": "src/main"
  },
  "include": ["src/main/**/*", "src/shared/**/*", "src/preload/**/*"]
}
```

**Step 10: Create Tailwind config**

Run:
```bash
npx tailwindcss init -p
```

Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5F5DC',
        'cream-dark': '#E8E8C8',
      },
    },
  },
  plugins: [],
};
```

**Step 11: Create directory structure**

Run:
```bash
mkdir -p src/main/services src/main/ipc src/main/tray
mkdir -p src/renderer/components/screens src/renderer/components/shared
mkdir -p src/renderer/hooks src/renderer/context
mkdir -p src/preload src/shared
```

**Step 12: Create src/renderer/index.html**

Create `src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
    <title>Init Window</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.tsx"></script>
  </body>
</html>
```

**Step 13: Create src/renderer/index.css**

Create `src/renderer/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

**Step 14: Create src/renderer/index.tsx**

Create `src/renderer/index.tsx`:
```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 15: Create src/renderer/App.tsx (placeholder)**

Create `src/renderer/App.tsx`:
```tsx
import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-cream p-4">
      <h1 className="text-2xl font-bold">Init Window</h1>
      <p className="text-gray-600">App is running!</p>
    </div>
  );
}
```

**Step 16: Create src/preload/index.ts**

Create `src/preload/index.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // Will be populated in Task 6
  ping: () => ipcRenderer.invoke('ping'),
});
```

**Step 17: Create src/main/index.ts**

Create `src/main/index.ts`:
```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('ping', () => 'pong');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

**Step 18: Build and verify app launches**

Run:
```bash
npm run build:main
npm run dev
```

Expected: Electron window opens showing "Init Window" and "App is running!"

**Step 19: Commit**

```bash
git add -A
git commit -m "chore: scaffold Electron + React + Tailwind project"
```

---

## Task 2: Shared Types

**Files:**
- Create: `src/shared/types.ts`

**Step 1: Create shared TypeScript interfaces**

Create `src/shared/types.ts`:
```typescript
export interface App {
  id: string;
  name: string;
  path: string;
  icon?: string;
}

export interface Collection {
  id: string;
  name: string;
  apps: App[];
  isAutoStart: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  autoStartDelay: number;
  showNotifications: boolean;
  minimizeToTray: boolean;
}

export interface AppData {
  collections: Collection[];
  settings: AppSettings;
}

export interface RunResultItem {
  app: string;
  reason?: string;
}

export interface RunResult {
  launched: string[];
  skipped: RunResultItem[];
  failed: RunResultItem[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoStartDelay: 15,
  showNotifications: true,
  minimizeToTray: true,
};
```

**Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add shared TypeScript interfaces"
```

---

## Task 3: Storage Service

**Files:**
- Create: `src/main/services/StorageService.ts`

**Step 1: Create StorageService**

Create `src/main/services/StorageService.ts`:
```typescript
import Store from 'electron-store';
import { AppData, Collection, AppSettings, DEFAULT_SETTINGS } from '../../shared/types';

const schema = {
  collections: {
    type: 'array' as const,
    default: [],
  },
  settings: {
    type: 'object' as const,
    default: DEFAULT_SETTINGS,
  },
};

class StorageService {
  private store: Store<AppData>;

  constructor() {
    this.store = new Store<AppData>({
      name: 'data',
      schema,
    });
  }

  getCollections(): Collection[] {
    return this.store.get('collections', []);
  }

  saveCollections(collections: Collection[]): void {
    this.store.set('collections', collections);
  }

  getSettings(): AppSettings {
    return this.store.get('settings', DEFAULT_SETTINGS);
  }

  saveSettings(settings: AppSettings): void {
    this.store.set('settings', settings);
  }

  getAll(): AppData {
    return {
      collections: this.getCollections(),
      settings: this.getSettings(),
    };
  }
}

export const storageService = new StorageService();
```

**Step 2: Commit**

```bash
git add src/main/services/StorageService.ts
git commit -m "feat: add StorageService with electron-store"
```

---

## Task 4: Process Service (Windows)

**Files:**
- Create: `src/main/services/ProcessService.interface.ts`
- Create: `src/main/services/ProcessService.windows.ts`

**Step 1: Create ProcessService interface**

Create `src/main/services/ProcessService.interface.ts`:
```typescript
import { App } from '../../shared/types';

export interface ProcessService {
  scanRunningProcesses(): Promise<App[]>;
  isProcessRunning(executablePath: string): Promise<boolean>;
  launchApp(executablePath: string): Promise<void>;
}
```

**Step 2: Create Windows implementation**

Create `src/main/services/ProcessService.windows.ts`:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { App } from '../../shared/types';
import { ProcessService } from './ProcessService.interface';

const execAsync = promisify(exec);

// System processes to exclude
const EXCLUDED_PROCESSES = new Set([
  'system', 'registry', 'smss.exe', 'csrss.exe', 'wininit.exe',
  'services.exe', 'lsass.exe', 'svchost.exe', 'fontdrvhost.exe',
  'dwm.exe', 'sihost.exe', 'taskhostw.exe', 'ctfmon.exe',
  'runtimebroker.exe', 'shellexperiencehost.exe', 'searchui.exe',
  'searchapp.exe', 'startmenuexperiencehost.exe', 'textinputhost.exe',
  'conhost.exe', 'dllhost.exe', 'backgroundtaskhost.exe',
  'applicationframehost.exe', 'systemsettings.exe', 'securityhealthservice.exe',
  'securityhealthsystray.exe', 'sgrmbroker.exe', 'searchindexer.exe',
  'searchprotocolhost.exe', 'searchfilterhost.exe', 'spoolsv.exe',
  'wudfhost.exe', 'dashost.exe', 'wmiprvse.exe', 'msdtc.exe',
  'vdsldr.exe', 'vds.exe', 'trustedinstaller.exe', 'tiworker.exe',
  'msiexec.exe', 'audiodg.exe', 'cmd.exe', 'powershell.exe',
  'windowsterminal.exe', 'openssh.exe', 'git.exe', 'node.exe',
  'electron.exe', 'init-window.exe',
]);

class WindowsProcessService implements ProcessService {
  async scanRunningProcesses(): Promise<App[]> {
    try {
      // Use WMIC to get process name and executable path
      const { stdout } = await execAsync(
        'wmic process get Name,ExecutablePath /FORMAT:CSV',
        { maxBuffer: 10 * 1024 * 1024 }
      );

      const lines = stdout.trim().split('\n').slice(1); // Skip header
      const processMap = new Map<string, App>();

      for (const line of lines) {
        const parts = line.trim().split(',');
        if (parts.length < 3) continue;

        const executablePath = parts[1]?.trim();
        const name = parts[2]?.trim();

        if (!executablePath || !name) continue;
        if (EXCLUDED_PROCESSES.has(name.toLowerCase())) continue;
        if (!fs.existsSync(executablePath)) continue;

        // Dedupe by path
        if (!processMap.has(executablePath)) {
          processMap.set(executablePath, {
            id: uuidv4(),
            name: path.basename(name, '.exe'),
            path: executablePath,
          });
        }
      }

      return Array.from(processMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    } catch (error) {
      console.error('Failed to scan processes:', error);
      return [];
    }
  }

  async isProcessRunning(executablePath: string): Promise<boolean> {
    try {
      const processName = path.basename(executablePath);
      const { stdout } = await execAsync(
        `tasklist /FI "IMAGENAME eq ${processName}" /NH`
      );
      return stdout.toLowerCase().includes(processName.toLowerCase());
    } catch {
      return false;
    }
  }

  async launchApp(executablePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(`start "" "${executablePath}"`, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}

export const processService = new WindowsProcessService();
```

**Step 3: Commit**

```bash
git add src/main/services/ProcessService.interface.ts src/main/services/ProcessService.windows.ts
git commit -m "feat: add Windows ProcessService for scanning and launching apps"
```

---

## Task 5: Collection Service

**Files:**
- Create: `src/main/services/CollectionService.ts`

**Step 1: Create CollectionService**

Create `src/main/services/CollectionService.ts`:
```typescript
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { Collection, App, RunResult } from '../../shared/types';
import { storageService } from './StorageService';
import { processService } from './ProcessService.windows';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CollectionService {
  list(): Collection[] {
    return storageService.getCollections();
  }

  get(id: string): Collection | undefined {
    return this.list().find((c) => c.id === id);
  }

  create(name: string, apps: App[]): Collection {
    const collections = this.list();

    const collection: Collection = {
      id: uuidv4(),
      name: name || `Collection ${collections.length + 1}`,
      apps,
      isAutoStart: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    collections.push(collection);
    storageService.saveCollections(collections);
    return collection;
  }

  update(id: string, updates: Partial<Pick<Collection, 'name' | 'apps'>>): Collection | null {
    const collections = this.list();
    const index = collections.findIndex((c) => c.id === id);

    if (index === -1) return null;

    collections[index] = {
      ...collections[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageService.saveCollections(collections);
    return collections[index];
  }

  delete(id: string): boolean {
    const collections = this.list();
    const filtered = collections.filter((c) => c.id !== id);

    if (filtered.length === collections.length) return false;

    storageService.saveCollections(filtered);
    return true;
  }

  setAutoStart(id: string): Collection | null {
    const collections = this.list();
    const index = collections.findIndex((c) => c.id === id);

    if (index === -1) return null;

    // Unset all others, set this one
    collections.forEach((c, i) => {
      c.isAutoStart = i === index;
      c.updatedAt = new Date().toISOString();
    });

    storageService.saveCollections(collections);
    return collections[index];
  }

  clearAutoStart(): void {
    const collections = this.list();
    collections.forEach((c) => {
      c.isAutoStart = false;
    });
    storageService.saveCollections(collections);
  }

  getAutoStartCollection(): Collection | undefined {
    return this.list().find((c) => c.isAutoStart);
  }

  async run(id: string): Promise<RunResult> {
    const collection = this.get(id);

    if (!collection) {
      return { launched: [], skipped: [], failed: [{ app: 'Unknown', reason: 'Collection not found' }] };
    }

    const result: RunResult = {
      launched: [],
      skipped: [],
      failed: [],
    };

    for (const app of collection.apps) {
      // Check if executable exists
      if (!fs.existsSync(app.path)) {
        result.failed.push({ app: app.name, reason: 'Executable not found' });
        continue;
      }

      // Check if already running
      const isRunning = await processService.isProcessRunning(app.path);
      if (isRunning) {
        result.skipped.push({ app: app.name, reason: 'Already running' });
        continue;
      }

      // Launch
      try {
        await processService.launchApp(app.path);
        result.launched.push(app.name);
        await delay(500); // Prevent system overload
      } catch (error) {
        result.failed.push({
          app: app.name,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }
}

export const collectionService = new CollectionService();
```

**Step 2: Commit**

```bash
git add src/main/services/CollectionService.ts
git commit -m "feat: add CollectionService for CRUD and running collections"
```

---

## Task 6: IPC Handlers & Preload

**Files:**
- Create: `src/main/ipc/handlers.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Create: `src/renderer/types/electron.d.ts`

**Step 1: Create IPC handlers**

Create `src/main/ipc/handlers.ts`:
```typescript
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
```

**Step 2: Update src/preload/index.ts**

Replace `src/preload/index.ts`:
```typescript
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
};

contextBridge.exposeInMainWorld('electron', electronAPI);

export type ElectronAPI = typeof electronAPI;
```

**Step 3: Create TypeScript declaration for renderer**

Create `src/renderer/types/electron.d.ts`:
```typescript
import { ElectronAPI } from '../../preload/index';

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
```

**Step 4: Update src/main/index.ts to register handlers**

Replace `src/main/index.ts`:
```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc/handlers';

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

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

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
    app.quit();
  }
});
```

**Step 5: Verify IPC works**

Run: `npm run build:main && npm run dev`

Open DevTools console in Electron, run:
```javascript
await window.electron.scanProcesses()
```

Expected: Array of running apps returned

**Step 6: Commit**

```bash
git add src/main/ipc/handlers.ts src/main/index.ts src/preload/index.ts src/renderer/types/electron.d.ts
git commit -m "feat: add IPC handlers and preload bridge"
```

---

## Task 7: React Context & Hooks

**Files:**
- Create: `src/renderer/context/AppContext.tsx`
- Create: `src/renderer/hooks/useCollections.ts`
- Create: `src/renderer/hooks/useProcessScanner.ts`

**Step 1: Create AppContext**

Create `src/renderer/context/AppContext.tsx`:
```tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Collection, App, RunResult } from '../../shared/types';

interface AppContextType {
  collections: Collection[];
  loading: boolean;
  refreshCollections: () => Promise<void>;
  createCollection: (name: string, apps: App[]) => Promise<Collection>;
  updateCollection: (id: string, updates: { name?: string; apps?: App[] }) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  setAutoStart: (id: string) => Promise<void>;
  clearAutoStart: () => Promise<void>;
  runCollection: (id: string) => Promise<RunResult>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCollections = useCallback(async () => {
    const data = await window.electron.getCollections();
    setCollections(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshCollections();
  }, [refreshCollections]);

  const createCollection = async (name: string, apps: App[]): Promise<Collection> => {
    const collection = await window.electron.createCollection(name, apps);
    await refreshCollections();
    return collection;
  };

  const updateCollection = async (id: string, updates: { name?: string; apps?: App[] }) => {
    await window.electron.updateCollection(id, updates);
    await refreshCollections();
  };

  const deleteCollection = async (id: string) => {
    await window.electron.deleteCollection(id);
    await refreshCollections();
  };

  const setAutoStart = async (id: string) => {
    await window.electron.setAutoStart(id);
    await refreshCollections();
  };

  const clearAutoStart = async () => {
    await window.electron.clearAutoStart();
    await refreshCollections();
  };

  const runCollection = async (id: string): Promise<RunResult> => {
    return window.electron.runCollection(id);
  };

  return (
    <AppContext.Provider
      value={{
        collections,
        loading,
        refreshCollections,
        createCollection,
        updateCollection,
        deleteCollection,
        setAutoStart,
        clearAutoStart,
        runCollection,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
```

**Step 2: Create useProcessScanner hook**

Create `src/renderer/hooks/useProcessScanner.ts`:
```typescript
import { useState, useCallback } from 'react';
import { App } from '../../shared/types';

export function useProcessScanner() {
  const [apps, setApps] = useState<App[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const result = await window.electron.scanProcesses();
      setApps(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan processes');
      setApps([]);
    } finally {
      setScanning(false);
    }
  }, []);

  const clear = useCallback(() => {
    setApps([]);
    setError(null);
  }, []);

  return { apps, scanning, error, scan, clear };
}
```

**Step 3: Commit**

```bash
git add src/renderer/context/AppContext.tsx src/renderer/hooks/useProcessScanner.ts
git commit -m "feat: add React context and hooks for state management"
```

---

## Task 8: Shared UI Components

**Files:**
- Create: `src/renderer/components/shared/Button.tsx`
- Create: `src/renderer/components/shared/AppListItem.tsx`
- Create: `src/renderer/components/shared/CollectionCard.tsx`

**Step 1: Create Button component**

Create `src/renderer/components/shared/Button.tsx`:
```tsx
import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium rounded transition-colors disabled:opacity-50';

  const variants = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
  };

  const sizes = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

**Step 2: Create AppListItem component**

Create `src/renderer/components/shared/AppListItem.tsx`:
```tsx
import React from 'react';
import { App } from '../../../shared/types';

interface AppListItemProps {
  app: App;
  selected?: boolean;
  onToggle?: (app: App) => void;
  onRemove?: (app: App) => void;
  showCheckbox?: boolean;
  showRemove?: boolean;
}

export function AppListItem({
  app,
  selected = false,
  onToggle,
  onRemove,
  showCheckbox = false,
  showRemove = false,
}: AppListItemProps) {
  return (
    <div className="flex items-center gap-3 p-2 hover:bg-cream-dark rounded">
      {showCheckbox && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle?.(app)}
          className="w-4 h-4 accent-blue-500"
        />
      )}

      <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center text-xs">
        {app.name.charAt(0).toUpperCase()}
      </div>

      <span className="flex-1 truncate">{app.name}</span>

      {showRemove && (
        <button
          onClick={() => onRemove?.(app)}
          className="text-red-500 hover:text-red-700 px-2"
        >
          ×
        </button>
      )}
    </div>
  );
}
```

**Step 3: Create CollectionCard component**

Create `src/renderer/components/shared/CollectionCard.tsx`:
```tsx
import React from 'react';
import { Collection } from '../../../shared/types';

interface CollectionCardProps {
  collection: Collection;
  onRun: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleAutoStart: (id: string) => void;
}

export function CollectionCard({
  collection,
  onRun,
  onEdit,
  onDelete,
  onToggleAutoStart,
}: CollectionCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium truncate flex-1">{collection.name}</h3>
        <button
          onClick={() => onToggleAutoStart(collection.id)}
          className={`text-xl ${collection.isAutoStart ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500`}
          title={collection.isAutoStart ? 'Auto-start enabled' : 'Click to auto-start'}
        >
          ★
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-3">
        {collection.apps.length} app{collection.apps.length !== 1 ? 's' : ''}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => onRun(collection.id)}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm"
        >
          ▶ Run
        </button>
        <button
          onClick={() => onEdit(collection.id)}
          className="bg-gray-200 hover:bg-gray-300 py-1 px-3 rounded text-sm"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(collection.id)}
          className="bg-red-100 hover:bg-red-200 text-red-600 py-1 px-3 rounded text-sm"
        >
          ×
        </button>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/renderer/components/shared/
git commit -m "feat: add shared UI components (Button, AppListItem, CollectionCard)"
```

---

## Task 9: Capture & Build Screen

**Files:**
- Create: `src/renderer/components/screens/CaptureAndBuildScreen.tsx`

**Step 1: Create CaptureAndBuildScreen**

Create `src/renderer/components/screens/CaptureAndBuildScreen.tsx`:
```tsx
import React, { useState } from 'react';
import { App } from '../../../shared/types';
import { useProcessScanner } from '../../hooks/useProcessScanner';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../shared/Button';
import { AppListItem } from '../shared/AppListItem';

interface CaptureAndBuildScreenProps {
  onBuildComplete: () => void;
}

export function CaptureAndBuildScreen({ onBuildComplete }: CaptureAndBuildScreenProps) {
  const { apps, scanning, scan, clear } = useProcessScanner();
  const { collections, createCollection } = useAppContext();
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [collectionName, setCollectionName] = useState('');

  const handleToggle = (app: App) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(app.id)) {
        next.delete(app.id);
      } else {
        next.add(app.id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedApps.size === apps.length) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(apps.map((a) => a.id)));
    }
  };

  const handleBuild = async () => {
    const selected = apps.filter((a) => selectedApps.has(a.id));
    if (selected.length === 0) return;

    const name = collectionName.trim() || `Collection ${collections.length + 1}`;
    await createCollection(name, selected);

    // Reset state
    setSelectedApps(new Set());
    setCollectionName('');
    clear();
    onBuildComplete();
  };

  return (
    <div className="flex flex-col h-full">
      {/* App list */}
      <div className="flex-1 overflow-y-auto p-4">
        {apps.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="mb-4">Click the button below to scan running applications</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">{apps.length} apps found</span>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                {selectedApps.size === apps.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-1">
              {apps.map((app) => (
                <AppListItem
                  key={app.id}
                  app={app}
                  selected={selectedApps.has(app.id)}
                  onToggle={handleToggle}
                  showCheckbox
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom section */}
      <div className="border-t bg-cream p-4 space-y-3">
        {apps.length > 0 && (
          <input
            type="text"
            placeholder={`Collection ${collections.length + 1}`}
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}

        <div className="flex gap-2">
          <Button
            onClick={scan}
            disabled={scanning}
            variant="secondary"
            className="flex-1"
          >
            {scanning ? 'Scanning...' : apps.length > 0 ? 'Rescan' : 'Capture Running Apps'}
          </Button>

          {apps.length > 0 && (
            <Button
              onClick={handleBuild}
              disabled={selectedApps.size === 0}
              className="flex-1"
            >
              Build ({selectedApps.size})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/screens/CaptureAndBuildScreen.tsx
git commit -m "feat: add CaptureAndBuildScreen for scanning and building collections"
```

---

## Task 10: Collections List Screen

**Files:**
- Create: `src/renderer/components/screens/CollectionsListScreen.tsx`

**Step 1: Create CollectionsListScreen**

Create `src/renderer/components/screens/CollectionsListScreen.tsx`:
```tsx
import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { CollectionCard } from '../shared/CollectionCard';
import { RunResult } from '../../../shared/types';

interface CollectionsListScreenProps {
  onEdit: (id: string) => void;
}

export function CollectionsListScreen({ onEdit }: CollectionsListScreenProps) {
  const { collections, loading, deleteCollection, setAutoStart, clearAutoStart, runCollection } =
    useAppContext();
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  const handleRun = async (id: string) => {
    setRunning(id);
    setRunResult(null);
    try {
      const result = await runCollection(id);
      setRunResult(result);
    } finally {
      setRunning(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this collection?')) {
      await deleteCollection(id);
    }
  };

  const handleToggleAutoStart = async (id: string) => {
    const collection = collections.find((c) => c.id === id);
    if (collection?.isAutoStart) {
      await clearAutoStart();
    } else {
      await setAutoStart(id);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {collections.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No collections yet.</p>
            <p className="text-sm mt-2">Go to Capture tab to create one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onRun={handleRun}
                onEdit={onEdit}
                onDelete={handleDelete}
                onToggleAutoStart={handleToggleAutoStart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Run result notification */}
      {runResult && (
        <div className="border-t bg-white p-3 text-sm">
          <div className="flex justify-between items-start">
            <div>
              {runResult.launched.length > 0 && (
                <p className="text-green-600">✓ Launched: {runResult.launched.join(', ')}</p>
              )}
              {runResult.skipped.length > 0 && (
                <p className="text-yellow-600">
                  ⚠ Skipped: {runResult.skipped.map((s) => s.app).join(', ')}
                </p>
              )}
              {runResult.failed.length > 0 && (
                <p className="text-red-600">
                  ✗ Failed: {runResult.failed.map((f) => f.app).join(', ')}
                </p>
              )}
            </div>
            <button
              onClick={() => setRunResult(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Running indicator */}
      {running && (
        <div className="border-t bg-blue-50 p-3 text-sm text-blue-600">
          Launching collection...
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/screens/CollectionsListScreen.tsx
git commit -m "feat: add CollectionsListScreen for viewing and running collections"
```

---

## Task 11: Edit Collection Screen

**Files:**
- Create: `src/renderer/components/screens/EditCollectionScreen.tsx`

**Step 1: Create EditCollectionScreen**

Create `src/renderer/components/screens/EditCollectionScreen.tsx`:
```tsx
import React, { useState, useEffect } from 'react';
import { App, Collection } from '../../../shared/types';
import { useAppContext } from '../../context/AppContext';
import { useProcessScanner } from '../../hooks/useProcessScanner';
import { Button } from '../shared/Button';
import { AppListItem } from '../shared/AppListItem';

interface EditCollectionScreenProps {
  collectionId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function EditCollectionScreen({
  collectionId,
  onSave,
  onCancel,
}: EditCollectionScreenProps) {
  const { collections, updateCollection } = useAppContext();
  const { apps: scannedApps, scanning, scan, clear } = useProcessScanner();

  const [name, setName] = useState('');
  const [apps, setApps] = useState<App[]>([]);
  const [showAddApps, setShowAddApps] = useState(false);
  const [selectedNewApps, setSelectedNewApps] = useState<Set<string>>(new Set());

  useEffect(() => {
    const collection = collections.find((c) => c.id === collectionId);
    if (collection) {
      setName(collection.name);
      setApps([...collection.apps]);
    }
  }, [collectionId, collections]);

  const handleRemoveApp = (app: App) => {
    setApps((prev) => prev.filter((a) => a.id !== app.id));
  };

  const handleToggleNewApp = (app: App) => {
    setSelectedNewApps((prev) => {
      const next = new Set(prev);
      if (next.has(app.id)) {
        next.delete(app.id);
      } else {
        next.add(app.id);
      }
      return next;
    });
  };

  const handleAddSelectedApps = () => {
    const existingPaths = new Set(apps.map((a) => a.path));
    const newApps = scannedApps.filter(
      (a) => selectedNewApps.has(a.id) && !existingPaths.has(a.path)
    );
    setApps((prev) => [...prev, ...newApps]);
    setShowAddApps(false);
    setSelectedNewApps(new Set());
    clear();
  };

  const handleSave = async () => {
    await updateCollection(collectionId, { name: name.trim(), apps });
    onSave();
  };

  const handleStartAddApps = async () => {
    setShowAddApps(true);
    await scan();
  };

  // Filter out apps already in collection
  const availableApps = scannedApps.filter(
    (a) => !apps.some((existing) => existing.path === a.path)
  );

  if (showAddApps) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4 bg-cream">
          <h2 className="font-medium">Add Apps</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {scanning ? (
            <p className="text-center text-gray-500">Scanning...</p>
          ) : availableApps.length === 0 ? (
            <p className="text-center text-gray-500">No new apps to add</p>
          ) : (
            <div className="space-y-1">
              {availableApps.map((app) => (
                <AppListItem
                  key={app.id}
                  app={app}
                  selected={selectedNewApps.has(app.id)}
                  onToggle={handleToggleNewApp}
                  showCheckbox
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-4 flex gap-2">
          <Button variant="secondary" onClick={() => setShowAddApps(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleAddSelectedApps}
            disabled={selectedNewApps.size === 0}
            className="flex-1"
          >
            Add ({selectedNewApps.size})
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 bg-cream">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Collection name"
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {apps.length === 0 ? (
          <p className="text-center text-gray-500">No apps in this collection</p>
        ) : (
          <div className="space-y-1">
            {apps.map((app) => (
              <AppListItem
                key={app.id}
                app={app}
                onRemove={handleRemoveApp}
                showRemove
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-4 space-y-2">
        <Button variant="secondary" onClick={handleStartAddApps} className="w-full">
          + Add Apps
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/screens/EditCollectionScreen.tsx
git commit -m "feat: add EditCollectionScreen for modifying collections"
```

---

## Task 12: Wire Up App Navigation

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/index.tsx`

**Step 1: Update App.tsx with navigation**

Replace `src/renderer/App.tsx`:
```tsx
import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { CaptureAndBuildScreen } from './components/screens/CaptureAndBuildScreen';
import { CollectionsListScreen } from './components/screens/CollectionsListScreen';
import { EditCollectionScreen } from './components/screens/EditCollectionScreen';

type Screen = 'capture' | 'collections' | 'edit';

function AppContent() {
  const [screen, setScreen] = useState<Screen>('capture');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    setEditingId(id);
    setScreen('edit');
  };

  const handleEditComplete = () => {
    setEditingId(null);
    setScreen('collections');
  };

  return (
    <div className="h-screen flex flex-col bg-cream">
      {/* Screen content */}
      <div className="flex-1 overflow-hidden">
        {screen === 'capture' && (
          <CaptureAndBuildScreen onBuildComplete={() => setScreen('collections')} />
        )}
        {screen === 'collections' && (
          <CollectionsListScreen onEdit={handleEdit} />
        )}
        {screen === 'edit' && editingId && (
          <EditCollectionScreen
            collectionId={editingId}
            onSave={handleEditComplete}
            onCancel={handleEditComplete}
          />
        )}
      </div>

      {/* Bottom navigation */}
      {screen !== 'edit' && (
        <div className="border-t bg-white flex">
          <button
            onClick={() => setScreen('capture')}
            className={`flex-1 py-3 text-sm font-medium ${
              screen === 'capture'
                ? 'text-blue-500 border-t-2 border-blue-500'
                : 'text-gray-500'
            }`}
          >
            Capture
          </button>
          <button
            onClick={() => setScreen('collections')}
            className={`flex-1 py-3 text-sm font-medium ${
              screen === 'collections'
                ? 'text-blue-500 border-t-2 border-blue-500'
                : 'text-gray-500'
            }`}
          >
            Collections
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
```

**Step 2: Build and test full UI flow**

Run: `npm run build:main && npm run dev`

Test:
1. Click "Capture Running Apps" → see list of apps
2. Select some apps, name collection, click Build
3. Switch to Collections tab → see collection
4. Click Run → apps launch
5. Click Edit → modify collection
6. Click star → toggle auto-start

**Step 3: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat: wire up app navigation between screens"
```

---

## Task 13: System Tray

**Files:**
- Create: `src/main/tray/TrayManager.ts`
- Modify: `src/main/index.ts`
- Create: `assets/icon.png` (placeholder)

**Step 1: Create assets directory and placeholder icon**

Run:
```bash
mkdir -p assets
```

Note: You'll need to add a 16x16 or 32x32 PNG icon at `assets/icon.png`. For now, create a simple placeholder or use any small PNG.

**Step 2: Create TrayManager**

Create `src/main/tray/TrayManager.ts`:
```typescript
import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import path from 'path';
import { collectionService } from '../services/CollectionService';

class TrayManager {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;

  init(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;

    // Create tray icon
    const iconPath = path.join(__dirname, '../../assets/icon.png');
    let icon: nativeImage;

    try {
      icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        // Fallback: create a simple colored icon
        icon = nativeImage.createEmpty();
      }
    } catch {
      icon = nativeImage.createEmpty();
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip('Init Window');

    // Left click: toggle window
    this.tray.on('click', () => {
      this.toggleWindow();
    });

    // Initial menu
    this.updateMenu();
  }

  updateMenu() {
    if (!this.tray) return;

    const collections = collectionService.list();

    const collectionItems: Electron.MenuItemConstructorOptions[] = collections.map((c) => ({
      label: `▶ ${c.name}${c.isAutoStart ? ' ★' : ''}`,
      click: async () => {
        await collectionService.run(c.id);
      },
    }));

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Collections',
        submenu: [
          ...collectionItems,
          ...(collectionItems.length > 0 ? [{ type: 'separator' as const }] : []),
          {
            label: 'Manage Collections...',
            click: () => this.showWindow(),
          },
        ],
      },
      { type: 'separator' },
      {
        label: 'Open Init Window',
        click: () => this.showWindow(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        },
      },
    ];

    const contextMenu = Menu.buildFromTemplate(template);
    this.tray.setContextMenu(contextMenu);
  }

  private toggleWindow() {
    if (!this.mainWindow) return;

    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide();
    } else {
      this.showWindow();
    }
  }

  private showWindow() {
    if (!this.mainWindow) return;
    this.mainWindow.show();
    this.mainWindow.focus();
  }

  destroy() {
    this.tray?.destroy();
    this.tray = null;
  }
}

export const trayManager = new TrayManager();
```

**Step 3: Update main/index.ts for tray integration**

Replace `src/main/index.ts`:
```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
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
```

**Step 4: Add IPC to refresh tray menu**

Update `src/main/ipc/handlers.ts`, add after collections handlers:
```typescript
import { trayManager } from '../tray/TrayManager';

// Add inside registerIpcHandlers, after collection operations that modify data:
// After collections:create, collections:update, collections:delete, collections:setAutoStart, collections:clearAutoStart

// Update the handlers to refresh tray:
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
```

**Step 5: Test tray functionality**

Run: `npm run build:main && npm run dev`

Test:
1. Close window with X → app hides to tray
2. Click tray icon → window shows
3. Right-click tray → see collections menu
4. Click collection in menu → apps launch

**Step 6: Commit**

```bash
git add src/main/tray/TrayManager.ts src/main/index.ts src/main/ipc/handlers.ts assets/
git commit -m "feat: add system tray with quick-launch menu"
```

---

## Task 14: Auto-Start Service (Windows)

**Files:**
- Create: `src/main/services/AutoStartService.interface.ts`
- Create: `src/main/services/AutoStartService.windows.ts`
- Modify: `src/main/index.ts`

**Step 1: Install winreg package**

Run:
```bash
npm install winreg
npm install --save-dev @types/winreg
```

**Step 2: Create AutoStartService interface**

Create `src/main/services/AutoStartService.interface.ts`:
```typescript
export interface AutoStartService {
  enable(): Promise<void>;
  disable(): Promise<void>;
  isEnabled(): Promise<boolean>;
}
```

**Step 3: Create Windows implementation**

Create `src/main/services/AutoStartService.windows.ts`:
```typescript
import { app } from 'electron';
import Registry from 'winreg';
import { AutoStartService } from './AutoStartService.interface';

const APP_NAME = 'InitWindow';

class WindowsAutoStartService implements AutoStartService {
  private regKey: Registry.Registry;

  constructor() {
    this.regKey = new Registry({
      hive: Registry.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    });
  }

  async enable(): Promise<void> {
    return new Promise((resolve, reject) => {
      const exePath = app.getPath('exe');
      const command = `"${exePath}" --auto-start`;

      this.regKey.set(APP_NAME, Registry.REG_SZ, command, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async disable(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.regKey.remove(APP_NAME, (err) => {
        if (err && err.message.includes('does not exist')) {
          resolve(); // Already disabled
        } else if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async isEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
      this.regKey.get(APP_NAME, (err, item) => {
        resolve(!err && item !== null);
      });
    });
  }
}

export const autoStartService = new WindowsAutoStartService();
```

**Step 4: Update main/index.ts for auto-start flag**

Add to `src/main/index.ts` after imports:
```typescript
import { collectionService } from './services/CollectionService';
import { storageService } from './services/StorageService';

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
```

Update `app.whenReady()`:
```typescript
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
```

**Step 5: Add IPC handlers for auto-start toggle**

Add to `src/main/ipc/handlers.ts`:
```typescript
import { autoStartService } from '../services/AutoStartService.windows';

// Inside registerIpcHandlers():
ipcMain.handle('autoStart:enable', async () => {
  await autoStartService.enable();
});

ipcMain.handle('autoStart:disable', async () => {
  await autoStartService.disable();
});

ipcMain.handle('autoStart:isEnabled', async () => {
  return autoStartService.isEnabled();
});
```

**Step 6: Update preload for auto-start**

Add to `src/preload/index.ts`:
```typescript
// Auto-start
enableAutoStart: (): Promise<void> =>
  ipcRenderer.invoke('autoStart:enable'),

disableAutoStart: (): Promise<void> =>
  ipcRenderer.invoke('autoStart:disable'),

isAutoStartEnabled: (): Promise<boolean> =>
  ipcRenderer.invoke('autoStart:isEnabled'),
```

**Step 7: Commit**

```bash
git add src/main/services/AutoStartService.interface.ts src/main/services/AutoStartService.windows.ts src/main/index.ts src/main/ipc/handlers.ts src/preload/index.ts
git commit -m "feat: add Windows auto-start via Registry"
```

---

## Task 15: Final Integration & Polish

**Files:**
- Update various files for edge cases and polish

**Step 1: Add loading states and error handling in UI**

Update components to show loading spinners and handle errors gracefully. (Already included in previous implementations)

**Step 2: Test full flow end-to-end**

Run: `npm run build:main && npm run dev`

Verify:
- [ ] Capture apps works
- [ ] Build collection works
- [ ] Collections list displays
- [ ] Run collection launches apps
- [ ] Skips already running apps with warning
- [ ] Edit collection works
- [ ] Delete collection works
- [ ] Star/auto-start toggle works
- [ ] System tray appears
- [ ] Close to tray works
- [ ] Tray menu shows collections
- [ ] Quick-launch from tray works

**Step 3: Build production app**

Run:
```bash
npm run dist
```

Verify: Installer created in `release/` folder

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final integration and polish"
```

---

## Summary

| Task | Description | Est. Steps |
|------|-------------|------------|
| 1 | Project Scaffolding | 19 |
| 2 | Shared Types | 2 |
| 3 | Storage Service | 2 |
| 4 | Process Service (Windows) | 3 |
| 5 | Collection Service | 2 |
| 6 | IPC Handlers & Preload | 6 |
| 7 | React Context & Hooks | 3 |
| 8 | Shared UI Components | 4 |
| 9 | Capture & Build Screen | 2 |
| 10 | Collections List Screen | 2 |
| 11 | Edit Collection Screen | 2 |
| 12 | Wire Up Navigation | 3 |
| 13 | System Tray | 6 |
| 14 | Auto-Start Service | 7 |
| 15 | Final Integration | 4 |

**Total: 15 tasks, ~67 steps**

---

Plan complete and saved to `docs/plans/2026-01-30-init-window-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
