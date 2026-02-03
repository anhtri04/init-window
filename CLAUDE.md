# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
# Development
npm run dev              # Start Vite dev server + Electron with HMR
npm run dev:renderer     # Start Vite dev server only (port 5173)
npm run dev:main         # Start Electron only (requires built renderer)

# Production Build
npm run build            # Build both renderer and main processes
npm run build:renderer   # Bundle React app with Vite -> dist/renderer/
npm run build:main       # Compile TypeScript main process -> dist/
npm run dist             # Build + create Windows installer -> release/

# Type Checking
npx tsc --noEmit         # Check TypeScript errors without emitting
```

## Architecture

**Init Window** is a Windows desktop application built with Electron, React, and TypeScript. It captures running applications, saves them as collections, and allows launching entire workspaces with one click.

### Electron Multi-Process Model

```
Main Process (Node.js)          Preload Script             Renderer Process (React)
├── index.ts                    └── index.ts               ├── App.tsx
├── ipc/handlers.ts (IPC)       └── Exposes typed API      ├── context/AppContext.tsx
└── services/                                              └── components/screens/
    ├── ProcessService.windows.ts
    ├── CollectionService.ts
    ├── StorageService.ts
    └── AutoStartService.windows.ts
```

- **Main Process** (`src/main/`): Node.js backend managing app lifecycle, native OS integration, and business logic via service classes.
- **Preload Script** (`src/preload/`): Security bridge using `contextBridge.exposeInMainWorld()` to expose a typed API to the renderer.
- **Renderer Process** (`src/renderer/`): React 18 UI running in Chromium with Tailwind CSS.

### Security Model

- `contextIsolation: true` - Preload scripts run in isolated context
- `nodeIntegration: false` - Renderer cannot access Node.js directly
- All main process access goes through IPC channels defined in `src/main/ipc/handlers.ts` and exposed via `src/preload/index.ts`

### Platform Abstraction Pattern

The codebase uses platform abstraction interfaces with Windows implementations:

- `ProcessService.interface.ts` → `ProcessService.windows.ts`
- `AutoStartService.interface.ts` → `AutoStartService.windows.ts`

Future macOS/Linux support would add `.darwin.ts` and `.linux.ts` implementations.

### IPC Communication Channels

| Channel | Handler Location | Purpose |
|---------|-----------------|---------|
| `process:scan` | handlers.ts:11 | Scan running Windows applications |
| `collections:list/get/create/update/delete` | handlers.ts:16-40 | Collection CRUD operations |
| `collections:setAutoStart/clearAutoStart` | handlers.ts:42-51 | Mark collection for auto-start |
| `collections:run` | handlers.ts:53 | Launch all apps in a collection |
| `settings:get/update` | handlers.ts:57-65 | App settings management |
| `autoStart:enable/disable/isEnabled` | handlers.ts:67-78 | Windows startup integration |

### Key Configuration Files

- `vite.config.ts` - Vite root is `src/renderer/`, output to `dist/renderer/`, port 5173
- `tsconfig.json` - Base TypeScript config (ES2020, ESNext)
- `tsconfig.main.json` - Main process config (CommonJS module output, includes `src/main/`, `src/shared/`, `src/preload/`)

### Build Outputs

- `dist/` - Compiled TypeScript and bundled renderer (git-ignored)
- `dist/main/index.js` - Main process entry point (referenced by package.json "main")
- `dist/renderer/` - Vite bundled React app
- `release/` - Electron-builder output containing the Windows installer

### Process Service Implementation

`ProcessService.windows.ts` implements sophisticated Windows process filtering:
- Executes WMIC commands to enumerate processes
- Excludes 90+ system processes (Windows internals, security, updates)
- Path-based exclusions (System32, SysWOW64, WinSxS)
- Smart deduplication by parent directory with priority for "main" executables
- Icon extraction via PowerShell/.NET with caching

### Storage

Uses `electron-store` for JSON persistence. Data stored in user's app data directory:
- Collections with apps, auto-start flags, timestamps
- App settings (delay, notifications, exclusions)
