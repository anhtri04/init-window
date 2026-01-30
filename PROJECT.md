# Init Window - Project Architecture

## Overview

**Init Window** is a Windows desktop application built with Electron. It is a productivity tool that automates workspace setup by allowing users to:
- Capture currently running applications
- Save them as named "collections"
- Launch all apps in a collection with one click
- Auto-start collections when Windows boots
- Access collections via a system tray menu

---

## Project Structure

```
C:\Users\Anh Tri\Desktop\final\init-window\
├── src/
│   ├── main/                          # Electron Main Process (Node.js)
│   │   ├── index.ts                   # App entry point, window creation
│   │   ├── ipc/
│   │   │   └── handlers.ts            # IPC request handlers
│   │   ├── services/
│   │   │   ├── ProcessService.interface.ts    # Platform abstraction interface
│   │   │   ├── ProcessService.windows.ts      # Windows process scanning/launching
│   │   │   ├── AutoStartService.interface.ts  # Auto-start interface
│   │   │   ├── AutoStartService.windows.ts    # Windows Registry auto-start
│   │   │   ├── CollectionService.ts           # Collection CRUD + run logic
│   │   │   └── StorageService.ts              # electron-store persistence
│   │   └── tray/
│   │       └── TrayManager.ts         # System tray icon and menu
│   ├── preload/                       # Preload script (security bridge)
│   │   └── index.ts                   # Exposes safe API to renderer
│   ├── renderer/                      # React UI (Chromium)
│   │   ├── index.html                 # HTML entry point
│   │   ├── index.tsx                  # React entry point
│   │   ├── index.css                  # Tailwind CSS imports
│   │   ├── App.tsx                    # Main app component with navigation
│   │   ├── types/
│   │   │   └── electron.d.ts          # Window.electron type declarations
│   │   ├── context/
│   │   │   └── AppContext.tsx         # React context for collections state
│   │   ├── hooks/
│   │   │   └── useProcessScanner.ts   # Hook for scanning running apps
│   │   └── components/
│   │       ├── screens/
│   │       │   ├── CaptureAndBuildScreen.tsx   # Scan and create collections
│   │       │   ├── CollectionsListScreen.tsx   # View and run collections
│   │       │   └── EditCollectionScreen.tsx    # Modify collections
│   │       └── shared/
│   │           ├── Button.tsx         # Reusable button component
│   │           ├── AppListItem.tsx    # App list item with checkbox/remove
│   │           └── CollectionCard.tsx # Collection card with actions
│   └── shared/                        # Shared between main and renderer
│       └── types.ts                   # TypeScript interfaces
├── docs/plans/                        # Design and implementation docs
├── dist/                              # Compiled output
├── release/                           # Electron-builder output
├── package.json                       # Dependencies and scripts
├── tsconfig.json                      # Base TypeScript config
├── tsconfig.main.json                 # Main process config
├── vite.config.ts                     # Vite configuration
├── tailwind.config.js                 # Tailwind CSS configuration
└── postcss.config.js                  # PostCSS configuration
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Electron 28.0.0 | Desktop app shell (main + renderer processes) |
| **UI Framework** | React 18.2.0 | Component-based UI |
| **Styling** | Tailwind CSS 3.4.0 | Utility-first CSS |
| **Build Tool** | Vite 5.0.0 | Dev server and renderer bundling |
| **Language** | TypeScript 5.9.3 | Type-safe JavaScript |
| **Storage** | electron-store 8.1.0 | JSON persistence |
| **Windows Registry** | winreg 1.2.5 | Auto-start registry manipulation |
| **Utilities** | uuid 9.0.0 | UUID generation |

---

## Architecture Overview

### Electron Model

The application follows Electron's multi-process architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                         Main Process                         │
│  (Node.js - manages app lifecycle, native OS integration)     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Services                                               ││
│  │  - ProcessService (process scanning/launching)          ││
│  │  - CollectionService (CRUD + run logic)                 ││
│  │  - StorageService (data persistence)                    ││
│  │  - AutoStartService (Windows Registry)                  ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  IPC Handlers                                           ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  TrayManager (system tray integration)                  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              │ IPC (contextBridge)
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Preload Script                          │
│  (Security bridge - exposes safe API to renderer)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Renderer Process                        │
│  (Chromium + React - UI and user interaction)                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  React Context (AppContext)                             ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Screens                                                ││
│  │  - CaptureAndBuildScreen                                ││
│  │  - CollectionsListScreen                                ││
│  │  - EditCollectionScreen                                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Security Model

The application follows Electron security best practices:

1. **Context Isolation** (`contextIsolation: true`) - Preload scripts run in isolated context
2. **No Node Integration** (`nodeIntegration: false`) - Renderer cannot access Node.js directly
3. **Content Security Policy** - Restricts resource loading in renderer
4. **Preload API Bridge** - All main process access goes through typed, exposed API via `contextBridge`

---

## IPC Communication Channels

| Channel | Direction | Payload | Response |
|---------|-----------|---------|----------|
| `process:scan` | invoke | - | `App[]` |
| `collections:list` | invoke | - | `Collection[]` |
| `collections:get` | invoke | `id: string` | `Collection \| undefined` |
| `collections:create` | invoke | `name, apps` | `Collection` |
| `collections:update` | invoke | `id, updates` | `Collection \| null` |
| `collections:delete` | invoke | `id: string` | `boolean` |
| `collections:setAutoStart` | invoke | `id: string` | `Collection \| null` |
| `collections:clearAutoStart` | invoke | - | `void` |
| `collections:run` | invoke | `id: string` | `RunResult` |
| `settings:get` | invoke | - | `AppSettings` |
| `settings:update` | invoke | `settings` | `AppSettings` |
| `autoStart:enable` | invoke | - | `void` |
| `autoStart:disable` | invoke | - | `void` |
| `autoStart:isEnabled` | invoke | - | `boolean` |

---

## Core Components

### Main Process (`src/main/`)

#### index.ts
- Application entry point and lifecycle management
- Creates `BrowserWindow` (400x600, non-resizable)
- Handles `--auto-start` flag for silent startup
- Manages app minimize-to-tray behavior

#### ipc/handlers.ts
- Registers all `ipcMain.handle()` channels
- Bridges renderer requests to services
- Updates tray menu when collections change

#### Services

| Service | File | Responsibility |
|---------|------|---------------|
| **ProcessService** | `ProcessService.interface.ts` | Platform abstraction interface |
| | `ProcessService.windows.ts` | Scans processes via WMIC, launches via `start` command |
| **CollectionService** | `CollectionService.ts` | CRUD operations, runs collections, manages auto-start |
| **StorageService** | `StorageService.ts` | electron-store wrapper for persistence |
| **AutoStartService** | `AutoStartService.interface.ts` | Platform abstraction interface |
| | `AutoStartService.windows.ts` | Windows Registry Run key management |

#### TrayManager
- Creates and manages system tray icon
- Builds dynamic context menu with collections
- Shows/hides window on click

### Preload Script (`src/preload/`)

#### index.ts
- Uses `contextBridge.exposeInMainWorld()` for secure API exposure
- Wraps `ipcRenderer.invoke()` calls
- Exports type-safe API for renderer

### Renderer Process (`src/renderer/`)

#### App.tsx
- Root component managing screen state
- Bottom navigation (Capture/Collections tabs)
- Wraps app in `AppProvider`

#### AppContext.tsx
- React context for collections state management
- Provides collections data and operations to all components
- Handles loading states

#### Screens

| Screen | Purpose |
|--------|---------|
| **CaptureAndBuildScreen** | Scan running apps, select apps, create collections |
| **CollectionsListScreen** | Display collections, run/edit/delete/auto-start |
| **EditCollectionScreen** | Modify collection name, add/remove apps |

#### Shared Components

| Component | Purpose |
|-----------|---------|
| **Button** | Reusable button with variants (primary, secondary, danger) |
| **AppListItem** | App row with checkbox or remove button |
| **CollectionCard** | Collection display with action buttons |

### Shared Types (`src/shared/types.ts`)

```typescript
interface App {
  name: string;
  path: string;
}

interface Collection {
  id: string;
  name: string;
  apps: App[];
  autoStart: boolean;
}

interface RunResult {
  launched: App[];
  skipped: App[];
  failed: App[];
}
```

---

## Data Flow

### Scanning for Apps
```
User clicks Scan
    ↓
Renderer: useProcessScanner hook
    ↓
IPC: process:scan
    ↓
Main: ProcessService.scanProcesses()
    ↓
WMIC command execution
    ↓
Return App[] to renderer
    ↓
Display selectable app list
```

### Creating a Collection
```
User enters name and selects apps
    ↓
Renderer: createCollection(name, apps)
    ↓
IPC: collections:create
    ↓
Main: CollectionService.create(name, apps)
    ↓
StorageService.save(appData)
    ↓
TrayManager.updateMenu()
    ↓
Return Collection to renderer
```

### Running a Collection
```
User clicks Run on collection
    ↓
Renderer: runCollection(id)
    ↓
IPC: collections:run
    ↓
Main: CollectionService.run(id)
    ↓
For each app:
  - Check if executable exists
  - Check if already running (deduplication)
  - Launch via ProcessService.launchApp()
    ↓
Return RunResult (launched/skipped/failed)
    ↓
Display results in UI
```

### Auto-Start Flow
```
Windows starts app with --auto-start flag
    ↓
Main: index.ts handles flag
    ↓
Wait 2 seconds (delay)
    ↓
CollectionService.runAutoStartCollection()
    ↓
Hide window to tray
```

---

## Build Configuration

### TypeScript

| Config | Target | Module | Use |
|--------|--------|--------|-----|
| `tsconfig.json` | ES2020 | ESNext | Base config |
| `tsconfig.main.json` | - | CommonJS | Main process |

### NPM Scripts

| Script | Purpose |
|--------|---------|
| `dev` | Run Vite dev server + Electron |
| `dev:main` | Run Electron in production mode |
| `dev:renderer` | Run Vite dev server only |
| `build` | Full production build |
| `build:main` | Compile main process |
| `build:renderer` | Bundle renderer |
| `dist` | Build + create installer |

### Vite Config

- Root: `src/renderer/`
- Port: 5173
- OutDir: `dist/renderer/`
- Base: `./` (for relative paths in production)

### Tailwind Config

- Content: `./src/renderer/**/*.{html,tsx,ts}`
- Custom colors: `cream` (#F5F5DC), `cream-dark` (#E8E8C8)

---

## Platform Abstraction

The codebase is designed for future multi-platform support:

### Implemented
- **Windows**: `ProcessService.windows.ts`, `AutoStartService.windows.ts`
  - Process scanning: WMIC (`wmic process get ...`)
  - Process checking: tasklist
  - Auto-start: Windows Registry (`HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`)

### Future Platforms
To add support for macOS or Linux, implement:

| Platform | ProcessService | AutoStartService |
|----------|----------------|------------------|
| **macOS** | `ps` command | LaunchAgents |
| **Linux** | `/proc` filesystem | `.desktop` files + systemd |

---

## Key Files Reference

| File | Approx Lines | Purpose |
|------|--------------|---------|
| `src/main/index.ts` | 99 | Main entry, window management |
| `src/main/ipc/handlers.ts` | 79 | IPC channel handlers |
| `src/main/services/CollectionService.ts` | 135 | Core business logic |
| `src/main/services/ProcessService.windows.ts` | 97 | Windows process handling |
| `src/main/services/StorageService.ts` | 49 | electron-store wrapper |
| `src/main/services/AutoStartService.windows.ts` | 52 | Registry auto-start |
| `src/main/tray/TrayManager.ts` | 144 | System tray management |
| `src/preload/index.ts` | 54 | Secure API exposure |
| `src/renderer/App.tsx` | 77 | Root component |
| `src/renderer/context/AppContext.tsx` | 87 | State management |
| `src/shared/types.ts` | 43 | Shared interfaces |
