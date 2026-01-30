# Init Window - Design Document

**Date:** 2026-01-30
**Status:** Approved
**Platform:** Windows-first (architected for future macOS/Linux expansion)

## Overview

Init Window is a desktop productivity tool that automates workspace setup. Instead of manually opening 10+ apps every morning, users capture their workspace once and launch it with a single click.

## Tech Stack

- **Framework:** Electron
- **UI:** React + Tailwind CSS
- **Storage:** JSON file via electron-store
- **Platform APIs:** Windows Registry (auto-start), tasklist (process scanning)

## Architecture

### Layer Structure

```
src/
├── main/                          # Electron Main Process
│   ├── index.ts                   # App entry point
│   ├── ipc/                       # IPC handlers
│   │   └── handlers.ts
│   ├── services/
│   │   ├── ProcessService.interface.ts
│   │   ├── ProcessService.windows.ts
│   │   ├── AutoStartService.interface.ts
│   │   ├── AutoStartService.windows.ts
│   │   ├── CollectionService.ts
│   │   ├── StorageService.ts
│   │   └── ServiceFactory.ts
│   └── tray/
│       └── TrayManager.ts
├── renderer/                      # React UI
│   ├── App.tsx
│   ├── components/
│   │   ├── screens/
│   │   │   ├── CaptureAndBuildScreen.tsx
│   │   │   ├── CollectionsListScreen.tsx
│   │   │   └── EditCollectionScreen.tsx
│   │   └── shared/
│   │       ├── AppListItem.tsx
│   │       ├── CollectionCard.tsx
│   │       └── Button.tsx
│   ├── hooks/
│   │   ├── useCollections.ts
│   │   └── useProcessScanner.ts
│   └── context/
│       └── AppContext.tsx
├── preload/
│   └── index.ts                   # Context bridge for secure IPC
└── shared/
    └── types.ts                   # Shared TypeScript interfaces
```

### Platform Abstraction

Services are abstracted behind interfaces to support future platforms:

```typescript
// ProcessService.interface.ts
interface ProcessService {
  scanRunningProcesses(): Promise<App[]>;
  isProcessRunning(path: string): Promise<boolean>;
  launchApp(path: string): Promise<void>;
}
```

`ServiceFactory.ts` returns the correct implementation based on `process.platform`.

## Data Model

### TypeScript Interfaces

```typescript
interface App {
  id: string;              // UUID
  name: string;            // "Google Chrome"
  path: string;            // Full executable path
  icon?: string;           // Base64 encoded icon
}

interface Collection {
  id: string;
  name: string;
  apps: App[];
  isAutoStart: boolean;    // Only one collection can be true
  createdAt: string;
  updatedAt: string;
}

interface AppData {
  collections: Collection[];
  settings: {
    autoStartDelay: number;        // Seconds (default: 15)
    showNotifications: boolean;    // Default: true
    minimizeToTray: boolean;       // Default: true
  }
}
```

### Storage

- **Location:** `%APPDATA%/init-window/data.json`
- **Library:** electron-store (JSON with type safety)
- **Backup:** Auto-backup to `data.backup.json` before writes
- **Access:** Main process only; Renderer uses IPC

## UI Screens

### Screen 1: Capture & Build

**Purpose:** Scan running apps, select which to include, name and save collection.

**Flow:**
1. User clicks "Capture Running Apps" button
2. Main process scans running processes via tasklist
3. UI displays checklist of apps with icons and names
4. User checks apps to include
5. User enters collection name (default: "Collection 1", "Collection 2", etc.)
6. User clicks "BUILD" button
7. Collection saved, navigate to Collections List

**Components:**
- Capture button (triggers scan)
- App checklist with icons
- Name input field
- Build button

### Screen 2: Collections List

**Purpose:** View all collections, run them, mark auto-start, edit/delete.

**Features:**
- List of collection cards
- Each card shows: name, app count, star icon (auto-start), play button, edit button, delete button
- Star icon toggles auto-start (only one active at a time)
- Play button runs the collection
- Bottom nav to switch to Capture screen

### Screen 3: Edit Collection

**Purpose:** Modify an existing collection.

**Features:**
- Editable collection name
- List of apps with remove button
- "Add App" button (triggers process scan to add more)
- Save button

## IPC Communication

### Channels

```typescript
// Renderer → Main (invoke/handle pattern)
'collections:list'     → Collection[]
'collections:create'   → Collection
'collections:update'   → Collection
'collections:delete'   → void
'collections:run'      → RunResult
'process:scan'         → App[]
```

### Preload Script

```typescript
contextBridge.exposeInMainWorld('electron', {
  scanProcesses: () => ipcRenderer.invoke('process:scan'),
  getCollections: () => ipcRenderer.invoke('collections:list'),
  createCollection: (data) => ipcRenderer.invoke('collections:create', data),
  updateCollection: (data) => ipcRenderer.invoke('collections:update', data),
  deleteCollection: (id) => ipcRenderer.invoke('collections:delete', id),
  runCollection: (id) => ipcRenderer.invoke('collections:run', id),
});
```

## Collection Launch Logic

### Launch Flow

```typescript
async function runCollection(collection: Collection): Promise<RunResult> {
  const results = { launched: [], skipped: [], failed: [] };

  for (const app of collection.apps) {
    // 1. Check if executable exists
    if (!fs.existsSync(app.path)) {
      results.failed.push({ app: app.name, reason: 'Executable not found' });
      continue;
    }

    // 2. Check if already running
    if (await isProcessRunning(app.path)) {
      results.skipped.push({ app: app.name, reason: 'Already running' });
      continue;
    }

    // 3. Launch
    try {
      exec(`"${app.path}"`);
      results.launched.push(app.name);
      await delay(500); // Prevent system overload
    } catch (error) {
      results.failed.push({ app: app.name, reason: error.message });
    }
  }

  return results;
}
```

### Error Handling

- **Missing executable:** Warn and skip, launch remaining apps
- **Already running:** Skip with notification, don't relaunch
- **Launch failure:** Log error, continue with remaining apps
- **User feedback:** Notification showing launched/skipped/failed counts

## System Tray

### Behavior

- App minimizes to system tray after launching a collection
- Close button (X) minimizes to tray instead of quitting
- Quit via tray menu or File → Quit

### Tray Menu

```
├── Collections
│   ├── ▶ Morning Routine
│   ├── ▶ Focus Mode
│   └── ───────────────
│   └── Manage Collections...
├── ───────────────
├── Open Init Window
└── Quit
```

### Icon States

- Normal: Default app icon
- (Optional) Launching: Animated or colored icon during launch

## Auto-Start

### Windows Implementation

Uses Windows Registry:

```typescript
// Key: HKCU\Software\Microsoft\Windows\CurrentVersion\Run
// Value: "InitWindow" = "C:\...\InitWindow.exe --auto-start"
```

### Startup Flow

1. Windows boots
2. Launches `InitWindow.exe --auto-start`
3. App detects `--auto-start` flag
4. Waits delay (default: 15 seconds)
5. Finds collection with `isAutoStart: true`
6. Runs collection silently
7. Minimizes to tray
8. Shows notification with results

### UI Controls

- Star icon on each collection in list view
- Clicking star sets that collection as auto-start (unsets others)
- Settings: Master toggle + delay slider (5-60 seconds)

## Process Scanning (Windows)

### Implementation

```typescript
// Using tasklist command
exec('tasklist /FO CSV /NH', (error, stdout) => {
  // Parse CSV output to get process names and PIDs
  // Use additional APIs to get executable paths
});
```

### Extracted Data

For each running process:
- Process name (e.g., "chrome.exe")
- Full executable path
- Icon (extracted from .exe)

### Filtering

- Exclude system processes (csrss, svchost, etc.)
- Exclude background services
- Show only user-facing applications

## Future Considerations

### macOS Support

- Process scanning: `ps aux` or Activity Monitor API
- Auto-start: LaunchAgents plist in `~/Library/LaunchAgents/`
- Storage: `~/Library/Application Support/init-window/`

### Linux Support

- Process scanning: `/proc` filesystem or `ps`
- Auto-start: `.desktop` file in `~/.config/autostart/`
- Storage: `~/.config/init-window/`

### Potential Enhancements

- Window position restoration
- App-specific integrations (VS Code workspaces, Chrome profiles)
- Collection scheduling (different times/days)
- Import/export collections
- Cloud sync
