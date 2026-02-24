# Phase 1: Foundation - Cross-Platform Abstraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Create the platform abstraction layer that enables macOS and Linux support while maintaining Windows functionality.

**Architecture:** Introduce a factory pattern with runtime platform detection to switch between Windows, macOS, and Linux service implementations. Extract IconService from ProcessService for better separation of concerns.

**Tech Stack:** Electron, TypeScript, Node.js child_process, winreg (Windows-only, made optional)

---

## Prerequisites

- Windows development environment (to test no-regression)
- Node.js and npm installed
- Existing codebase builds and runs on Windows

---

## Task 1: Create Service Factory Index

**Files:**
- Create: `src/main/services/index.ts`
- Modify: `src/main/ipc/handlers.ts:1-8` (update imports)

**Context:** Currently `handlers.ts` imports directly from `.windows` files. We need a factory that selects the correct implementation based on `process.platform`.

**Step 1: Create the factory file**

Create `src/main/services/index.ts`:

```typescript
import { ProcessService } from './ProcessService.interface';
import { AutoStartService } from './AutoStartService.interface';

function getProcessService(): ProcessService {
  switch (process.platform) {
    case 'win32':
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('./ProcessService.windows').processService;
    case 'darwin':
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('./ProcessService.darwin').processService;
    case 'linux':
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('./ProcessService.linux').processService;
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

function getAutoStartService(): AutoStartService {
  switch (process.platform) {
    case 'win32':
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('./AutoStartService.windows').autoStartService;
    case 'darwin':
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('./AutoStartService.darwin').autoStartService;
    case 'linux':
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('./AutoStartService.linux').autoStartService;
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

export const processService = getProcessService();
export const autoStartService = getAutoStartService();
```

**Step 2: Update handlers.ts imports**

Modify `src/main/ipc/handlers.ts` lines 4 and 7:

```typescript
// Change FROM:
import { processService } from '../services/ProcessService.windows';
import { autoStartService } from '../services/AutoStartService.windows';

// Change TO:
import { processService, autoStartService } from '../services';
```

**Step 3: Verify TypeScript compilation**

Run: `npm run build:main`

Expected: SUCCESS (no errors, but may warn about missing darwin/linux files)

**Step 4: Test Windows app still works**

Run: `npm run dev`

Expected: App launches, process scanning works, collections work

**Step 5: Commit**

```bash
git add src/main/services/index.ts src/main/ipc/handlers.ts
git commit -m "feat: add platform service factory abstraction"
```

---

## Task 2: Create IconService Interface

**Files:**
- Create: `src/main/services/IconService.interface.ts`

**Context:** Icon extraction is currently embedded in ProcessService. We need to extract it for cross-platform support.

**Step 1: Create the interface**

Create `src/main/services/IconService.interface.ts`:

```typescript
export interface IconService {
  /**
   * Extract icon from an executable and save to cache
   * @param executablePath Path to the executable
   * @returns Path to the extracted PNG icon, or undefined if extraction failed
   */
  extractIcon(executablePath: string): Promise<string | undefined>;
}
```

**Step 2: Verify compilation**

Run: `npm run build:main`

Expected: SUCCESS

**Step 3: Commit**

```bash
git add src/main/services/IconService.interface.ts
git commit -m "feat: add IconService interface"
```

---

## Task 3: Extract Windows IconService Implementation

**Files:**
- Create: `src/main/services/IconService.windows.ts`
- Modify: `src/main/services/ProcessService.windows.ts:1-260` (remove icon extraction)
- Modify: `src/main/services/ProcessService.interface.ts:1-8` (remove extractIcon method)

**Context:** Move the PowerShell-based icon extraction from ProcessService to a dedicated IconService.

**Step 1: Create Windows IconService**

Create `src/main/services/IconService.windows.ts`:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { IconService } from './IconService.interface';

const execAsync = promisify(exec);

// Directory for cached app icons
const ICON_CACHE_DIR = path.join(os.tmpdir(), 'init-window-icons');

class WindowsIconService implements IconService {
  async extractIcon(executablePath: string): Promise<string | undefined> {
    try {
      // Ensure cache directory exists
      if (!fs.existsSync(ICON_CACHE_DIR)) {
        fs.mkdirSync(ICON_CACHE_DIR, { recursive: true });
      }

      // Create unique filename based on executable path
      const hash = crypto.createHash('md5').update(executablePath).digest('hex');
      const iconPath = path.join(ICON_CACHE_DIR, `${hash}.png`);

      // Return cached icon if already exists
      if (fs.existsSync(iconPath)) {
        return iconPath;
      }

      // Use PowerShell to extract icon via .NET
      // Escape backslashes for PowerShell
      const psPath = executablePath.replace(/\\/g, '\\\\');
      const psIconPath = iconPath.replace(/\\/g, '\\\\');

      // Use base64 encoded command to avoid escaping hell
      const psScript = `
        Add-Type -AssemblyName System.Drawing
        try {
          $icon = [System.Drawing.Icon]::ExtractAssociatedIcon('${psPath}')
          if ($icon) {
            $bitmap = $icon.ToBitmap()
            $bitmap.Save('${psIconPath}', [System.Drawing.Imaging.ImageFormat]::Png)
            $icon.Dispose()
            $bitmap.Dispose()
            Write-Output 'SUCCESS'
          } else {
            Write-Output 'FAILED: No icon found'
          }
        } catch {
          Write-Output "FAILED: $_"
        }
      `;

      // Convert to base64 to avoid all escaping issues
      const psBytes = Buffer.from(psScript, 'utf16le');
      const psBase64 = psBytes.toString('base64');

      const command = `powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${psBase64}`;
      console.log(`[extractIcon] Executing command for ${path.basename(executablePath)}`);

      let stdout: string;
      let stderr: string;
      try {
        const result = await execAsync(command, { timeout: 10000 });
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (execError: any) {
        console.error(`[extractIcon] execAsync threw error:`, execError);
        return undefined;
      }

      console.log(`[extractIcon] stdout: "${stdout}"`);
      if (stderr) {
        console.warn(`[extractIcon] stderr: "${stderr}"`);
      }

      const result = stdout.trim();
      if (result === 'SUCCESS' && fs.existsSync(iconPath)) {
        console.log(`[extractIcon] SUCCESS for: ${path.basename(executablePath)}`);
        return iconPath;
      } else {
        console.warn(`[extractIcon] Failed for ${executablePath}, result: "${result}", file exists: ${fs.existsSync(iconPath)}`);
        return undefined;
      }
    } catch (error) {
      console.error(`[extractIcon] Error extracting icon for ${executablePath}:`, error);
      return undefined;
    }
  }
}

export const iconService = new WindowsIconService();
```

**Step 2: Update ProcessService.interface.ts**

Remove the `extractIcon` method from the interface:

```typescript
import { App } from '../../shared/types';

export interface ProcessService {
  scanRunningProcesses(): Promise<App[]>;
  isProcessRunning(executablePath: string): Promise<boolean>;
  launchApp(executablePath: string): Promise<void>;
  // extractIcon removed - now handled by IconService
}
```

**Step 3: Update ProcessService.windows.ts**

Remove the `extractIcon` method and import the IconService instead:

Changes to make:

1. Add import at top:
```typescript
import { iconService } from './IconService.windows';
```

2. Remove lines 181-256 (the entire extractIcon method)

3. Update the scanRunningProcesses method to use iconService (line 127-131):

```typescript
// Change FROM:
await Promise.all(
  apps.map(async (app) => {
    app.icon = await this.extractIcon(app.path);
  })
);

// Change TO:
await Promise.all(
  apps.map(async (app) => {
    app.icon = await iconService.extractIcon(app.path);
  })
);
```

4. Remove unused imports: `crypto` is no longer needed in ProcessService.windows.ts

**Step 4: Add IconService to factory**

Update `src/main/services/index.ts` to export iconService:

```typescript
import { ProcessService } from './ProcessService.interface';
import { AutoStartService } from './AutoStartService.interface';
import { IconService } from './IconService.interface';

// ... existing getProcessService and getAutoStartService functions ...

function getIconService(): IconService {
  switch (process.platform) {
    case 'win32':
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('./IconService.windows').iconService;
    case 'darwin':
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('./IconService.darwin').iconService;
    case 'linux':
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('./IconService.linux').iconService;
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

export const processService = getProcessService();
export const autoStartService = getAutoStartService();
export const iconService = getIconService();
```

**Step 5: Verify compilation**

Run: `npm run build:main`

Expected: SUCCESS

**Step 6: Test Windows app still works**

Run: `npm run dev`

Expected: App launches, process scanning works, icons display correctly

**Step 7: Commit**

```bash
git add src/main/services/IconService.windows.ts src/main/services/IconService.interface.ts src/main/services/ProcessService.windows.ts src/main/services/ProcessService.interface.ts src/main/services/index.ts
git commit -m "refactor: extract IconService from ProcessService"
```

---

## Task 4: Make winreg an Optional Dependency

**Files:**
- Modify: `src/main/services/AutoStartService.windows.ts:1-52` (conditional import)
- Modify: `package.json:48-54` (make winreg optional)

**Context:** `winreg` is a Windows-only native module. The app will fail to run on macOS/Linux if it's a required dependency.

**Step 1: Update AutoStartService.windows.ts with conditional import**

Replace the entire file content:

```typescript
import { app } from 'electron';
import { AutoStartService } from './AutoStartService.interface';

const APP_NAME = 'InitWindow';

class WindowsAutoStartService implements AutoStartService {
  private getRegKey() {
    // Dynamic import to avoid loading winreg on non-Windows platforms
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Registry = require('winreg');
    return new Registry({
      hive: Registry.HKCU,
      key: '\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
    });
  }

  async enable(): Promise<void> {
    return new Promise((resolve, reject) => {
      const exePath = app.getPath('exe');
      const command = `"${exePath}" --auto-start`;

      const regKey = this.getRegKey();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      regKey.set(APP_NAME, regKey.REG_SZ, command, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async disable(): Promise<void> {
    return new Promise((resolve, reject) => {
      const regKey = this.getRegKey();
      regKey.remove(APP_NAME, (err: Error | null) => {
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
      const regKey = this.getRegKey();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      regKey.get(APP_NAME, (err: Error | null, item: any) => {
        resolve(!err && item !== null);
      });
    });
  }
}

export const autoStartService = new WindowsAutoStartService();
```

**Step 2: Update package.json to make winreg optional**

Add `optionalDependencies` section and move winreg there:

```json
{
  "dependencies": {
    "electron-store": "^8.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "uuid": "^9.0.0"
  },
  "optionalDependencies": {
    "winreg": "^1.2.5"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.0",
    "@types/winreg": "^1.2.36",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.0",
    "concurrently": "^8.2.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.9.3",
    "vite": "^5.0.0",
    "wait-on": "^7.2.0"
  }
}
```

**Step 3: Reinstall dependencies**

Run: `npm install`

Expected: SUCCESS (winreg moves to optionalDependencies)

**Step 4: Verify Windows app still works**

Run: `npm run dev`

Expected: App launches, auto-start enable/disable works

**Step 5: Commit**

```bash
git add src/main/services/AutoStartService.windows.ts package.json
git commit -m "refactor: make winreg optional dependency for cross-platform support"
```

---

## Task 5: Create Placeholder Services for macOS and Linux

**Files:**
- Create: `src/main/services/ProcessService.darwin.ts`
- Create: `src/main/services/ProcessService.linux.ts`
- Create: `src/main/services/AutoStartService.darwin.ts`
- Create: `src/main/services/AutoStartService.linux.ts`
- Create: `src/main/services/IconService.darwin.ts`
- Create: `src/main/services/IconService.linux.ts`

**Context:** The factory in `index.ts` tries to require these files. They need to exist (even as stubs) for TypeScript compilation to succeed.

**Step 1: Create placeholder ProcessService.darwin.ts**

```typescript
import { App } from '../../shared/types';
import { ProcessService } from './ProcessService.interface';

class DarwinProcessService implements ProcessService {
  async scanRunningProcesses(): Promise<App[]> {
    console.warn('macOS process scanning not yet implemented');
    return [];
  }

  async isProcessRunning(executablePath: string): Promise<boolean> {
    console.warn('macOS process checking not yet implemented');
    return false;
  }

  async launchApp(executablePath: string): Promise<void> {
    console.warn('macOS app launching not yet implemented');
    throw new Error('Not implemented');
  }
}

export const processService = new DarwinProcessService();
```

**Step 2: Create placeholder ProcessService.linux.ts**

```typescript
import { App } from '../../shared/types';
import { ProcessService } from './ProcessService.interface';

class LinuxProcessService implements ProcessService {
  async scanRunningProcesses(): Promise<App[]> {
    console.warn('Linux process scanning not yet implemented');
    return [];
  }

  async isProcessRunning(executablePath: string): Promise<boolean> {
    console.warn('Linux process checking not yet implemented');
    return false;
  }

  async launchApp(executablePath: string): Promise<void> {
    console.warn('Linux app launching not yet implemented');
    throw new Error('Not implemented');
  }
}

export const processService = new LinuxProcessService();
```

**Step 3: Create placeholder AutoStartService.darwin.ts**

```typescript
import { AutoStartService } from './AutoStartService.interface';

class DarwinAutoStartService implements AutoStartService {
  async enable(): Promise<void> {
    console.warn('macOS auto-start not yet implemented');
    throw new Error('Not implemented');
  }

  async disable(): Promise<void> {
    console.warn('macOS auto-start not yet implemented');
    throw new Error('Not implemented');
  }

  async isEnabled(): Promise<boolean> {
    console.warn('macOS auto-start not yet implemented');
    return false;
  }
}

export const autoStartService = new DarwinAutoStartService();
```

**Step 4: Create placeholder AutoStartService.linux.ts**

```typescript
import { AutoStartService } from './AutoStartService.interface';

class LinuxAutoStartService implements AutoStartService {
  async enable(): Promise<void> {
    console.warn('Linux auto-start not yet implemented');
    throw new Error('Not implemented');
  }

  async disable(): Promise<void> {
    console.warn('Linux auto-start not yet implemented');
    throw new Error('Not implemented');
  }

  async isEnabled(): Promise<boolean> {
    console.warn('Linux auto-start not yet implemented');
    return false;
  }
}

export const autoStartService = new LinuxAutoStartService();
```

**Step 5: Create placeholder IconService.darwin.ts**

```typescript
import { IconService } from './IconService.interface';

class DarwinIconService implements IconService {
  async extractIcon(executablePath: string): Promise<string | undefined> {
    console.warn('macOS icon extraction not yet implemented');
    return undefined;
  }
}

export const iconService = new DarwinIconService();
```

**Step 6: Create placeholder IconService.linux.ts**

```typescript
import { IconService } from './IconService.interface';

class LinuxIconService implements IconService {
  async extractIcon(executablePath: string): Promise<string | undefined> {
    console.warn('Linux icon extraction not yet implemented');
    return undefined;
  }
}

export const iconService = new LinuxIconService();
```

**Step 7: Verify compilation**

Run: `npm run build:main`

Expected: SUCCESS (no errors, all platform files exist)

**Step 8: Test Windows app still works**

Run: `npm run dev`

Expected: App launches, all features work (process scan, collections, auto-start, icons)

**Step 9: Commit**

```bash
git add src/main/services/ProcessService.darwin.ts src/main/services/ProcessService.linux.ts src/main/services/AutoStartService.darwin.ts src/main/services/AutoStartService.linux.ts src/main/services/IconService.darwin.ts src/main/services/IconService.linux.ts
git commit -m "feat: add placeholder service implementations for macOS and Linux"
```

---

## Task 6: Final Verification and Build Test

**Files:**
- None (verification only)

**Step 1: Clean build**

Run: `npm run build`

Expected: SUCCESS (both renderer and main build successfully)

**Step 2: Test distribution build**

Run: `npm run dist`

Expected: SUCCESS (Windows installer created in `release/` directory)

**Step 3: Install and test the built app**

1. Run the installer from `release/`
2. Launch the installed app
3. Verify all features work:
   - Process scanning shows apps
   - Icons display correctly
   - Can create and save collections
   - Can launch collections
   - Auto-start can be enabled/disabled

**Step 4: Commit final changes**

```bash
git add -A
git commit -m "feat: complete Phase 1 foundation for cross-platform support"
```

---

## Phase 1 Completion Checklist

- [ ] Service factory created in `src/main/services/index.ts`
- [ ] IPC handlers updated to use factory exports
- [ ] IconService interface created
- [ ] Windows IconService extracted from ProcessService
- [ ] ProcessService interface updated (extractIcon removed)
- [ ] ProcessService.windows.ts uses iconService
- [ ] winreg made optional dependency
- [ ] AutoStartService.windows.ts uses dynamic import
- [ ] Placeholder services created for macOS and Linux
- [ ] Windows build works with no regression
- [ ] Distribution build succeeds
- [ ] All commits made

---

## Next Phase

After Phase 1 is complete, proceed to **Phase 2: macOS ProcessService Implementation** using the design document at `docs/plans/2026-02-01-cross-platform-design.md`.

Key files to create/modify in Phase 2:
- `src/main/services/ProcessService.darwin.ts` (replace placeholder)
- Add macOS-specific process exclusions
- Implement `ps` + `osascript` process scanning
- Implement `open` command for app launching
