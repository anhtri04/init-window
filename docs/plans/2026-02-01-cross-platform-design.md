# Cross-Platform Support Design Document

**Date:** 2026-02-01
**Scope:** Add macOS and Linux support to Init Window Electron app
**Approach:** Platform-by-platform (macOS first, then Linux)

---

## 1. Architecture Overview

### Platform Abstraction Layer

The current code imports Windows implementations directly. We introduce a **factory pattern** with runtime platform detection:

```typescript
// src/main/services/index.ts
export const getProcessService = (): IProcessService => {
  switch (process.platform) {
    case 'win32':
      return require('./ProcessService.windows').processService;
    case 'darwin':
      return require('./ProcessService.darwin').processService;
    case 'linux':
      return require('./ProcessService.linux').processService;
    default:
      throw new Error(`Unsupported platform: ${process.platform}`);
  }
};
```

Same pattern for `AutoStartService` and `IconService` (new abstraction for icon extraction).

### File Structure Changes

```
src/main/services/
├── ProcessService.interface.ts      (exists)
├── ProcessService.windows.ts        (exists, needs minor cleanup)
├── ProcessService.darwin.ts         (NEW - macOS)
├── ProcessService.linux.ts          (NEW - placeholder for now)
├── AutoStartService.interface.ts    (exists)
├── AutoStartService.windows.ts      (exists)
├── AutoStartService.darwin.ts       (NEW - macOS LaunchAgents)
├── AutoStartService.linux.ts        (NEW - placeholder)
├── IconService.interface.ts         (NEW)
├── IconService.windows.ts           (NEW - extract from ProcessService)
├── IconService.darwin.ts            (NEW - macOS icon extraction)
└── index.ts                         (NEW - platform factory)
```

### Dependency Changes

- Make `winreg` an **optional dependency** with platform checks
- Add `appdirs` or similar for cross-platform path handling (optional)

---

## 2. macOS ProcessService Implementation

The macOS implementation uses a hybrid shell command approach combining `ps`, `pgrep`, and `osascript`:

```typescript
// src/main/services/ProcessService.darwin.ts
class DarwinProcessService implements IProcessService {

  async scanProcesses(): Promise<ProcessInfo[]> {
    // Use ps to get process list with executable paths
    const { stdout } = await execAsync(
      `ps -eo pid,comm,args -c | grep -E '\\.app' | head -100`
    );

    // Parse and filter to get unique applications
    const processes = this.parsePsOutput(stdout);

    // Enrich with app bundle info using osascript
    for (const proc of processes) {
      const appInfo = await this.getAppInfoFromPath(proc.executablePath);
      if (appInfo) {
        proc.name = appInfo.displayName;
        proc.iconPath = appInfo.iconPath;
      }
    }

    return this.filterSystemProcesses(processes);
  }

  private async getAppInfoFromPath(path: string): Promise<AppInfo | null> {
    // Use AppleScript to get proper app name and icon from .app bundle
    const script = `
      tell application "System Events"
        set appPath to "${path}"
        set appFile to POSIX file appPath as alias
        set appProc to application file appFile
        return {name of appProc, path of appProc}
      end tell
    `;
    // Execute via osascript and parse results
  }

  async isProcessRunning(processName: string): Promise<boolean> {
    // Use pgrep for efficient process checking
    try {
      await execAsync(`pgrep -x "${processName}"`);
      return true;
    } catch {
      return false;
    }
  }

  async launchProcess(executablePath: string): Promise<void> {
    // Use 'open' command for macOS app bundles
    if (executablePath.endsWith('.app')) {
      await execAsync(`open "${executablePath}"`);
    } else {
      // Direct binary execution
      spawn(executablePath, [], { detached: true, stdio: 'ignore' });
    }
  }
}
```

### System Process Exclusions for macOS

Replace Windows-specific exclusions with macOS equivalents:

```typescript
const EXCLUDED_PROCESSES = new Set([
  'kernel', 'launchd', 'loginwindow', 'WindowServer',
  'Dock', 'Finder', 'SystemUIServer', 'spotlight',
  'mds', 'mdworker', 'coreaudiod', 'bluetoothd'
]);

const EXCLUDED_PATHS = [
  '/System/',
  '/usr/sbin/',
  '/sbin/',
  '/private/var/'
];
```

---

## 3. macOS AutoStartService Implementation

macOS uses **LaunchAgents** for user-level auto-start (equivalent to Windows Registry Run key):

```typescript
// src/main/services/AutoStartService.darwin.ts
class DarwinAutoStartService implements IAutoStartService {
  private get launchAgentPath(): string {
    // ~/Library/LaunchAgents/com.initwindow.app.plist
    return path.join(
      os.homedir(),
      'Library/LaunchAgents',
      `${APP_BUNDLE_ID}.plist`
    );
  }

  async isAutoStartEnabled(): Promise<boolean> {
    try {
      await fs.access(this.launchAgentPath);
      return true;
    } catch {
      return false;
    }
  }

  async enableAutoStart(): Promise<void> {
    const plistContent = `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${APP_BUNDLE_ID}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${getAppPath()}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>
    `.trim();

    // Ensure LaunchAgents directory exists
    await fs.mkdir(path.dirname(this.launchAgentPath), { recursive: true });
    await fs.writeFile(this.launchAgentPath, plistContent);

    // Load the launch agent
    await execAsync(`launchctl load ${this.launchAgentPath}`);
  }

  async disableAutoStart(): Promise<void> {
    // Unload and remove plist file
    try {
      await execAsync(`launchctl unload ${this.launchAgentPath}`);
    } catch {}
    await fs.unlink(this.launchAgentPath).catch(() => {});
  }
}
```

**Key Points:**
- LaunchAgents run when user logs in (equivalent to HKCU Registry Run)
- `launchctl` commands to load/unload the agent
- Plist file must be valid XML with proper structure

---

## 4. IconService Abstraction and macOS Implementation

Icon extraction is currently embedded in ProcessService.windows.ts using PowerShell. We extract this into a separate service for better separation of concerns:

```typescript
// src/main/services/IconService.interface.ts
export interface IIconService {
  extractIcon(executablePath: string, outputDir: string): Promise<string | null>;
  // Returns path to extracted PNG icon, or null if extraction failed
}

// src/main/services/IconService.windows.ts
class WindowsIconService implements IIconService {
  async extractIcon(executablePath: string, outputDir: string): Promise<string | null> {
    // Move existing PowerShell extraction logic here
    // Same implementation currently in ProcessService.windows.ts
  }
}

// src/main/services/IconService.darwin.ts
class DarwinIconService implements IIconService {
  async extractIcon(appPath: string, outputDir: string): Promise<string | null> {
    // macOS apps are bundles - icon is inside the bundle
    // Path: MyApp.app/Contents/Resources/AppIcon.icns or .png

    const iconPaths = [
      path.join(appPath, 'Contents/Resources/AppIcon.icns'),
      path.join(appPath, 'Contents/Resources/AppIcon.png'),
      path.join(appPath, 'Contents/Resources/icon.png'),
    ];

    // Find the icon file
    for (const iconPath of iconPaths) {
      try {
        await fs.access(iconPath);

        // Convert ICNS to PNG if needed using sips (built-in macOS tool)
        if (iconPath.endsWith('.icns')) {
          const pngPath = path.join(outputDir, `${path.basename(appPath)}.png`);
          await execAsync(`sips -s format png "${iconPath}" --out "${pngPath}"`);
          return pngPath;
        }

        return iconPath; // Already PNG
      } catch {}
    }

    // Fallback: use osascript to extract icon via Finder
    return this.extractIconViaAppleScript(appPath, outputDir);
  }

  private async extractIconViaAppleScript(appPath: string, outputDir: string): Promise<string | null> {
    // Use AppleScript to get icon from Finder and save to file
    // More complex but works for all .app bundles
  }
}
```

**Integration:** ProcessService calls IconService after identifying an executable, storing the icon path in the process info.

---

## 5. Build Configuration and Packaging

Update electron-builder configuration in `package.json`:

```json
{
  "build": {
    "appId": "com.initwindow.app",
    "productName": "Init Window",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "mac": {
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        },
        {
          "target": "zip",
          "arch": ["x64", "arm64"]
        }
      ],
      "category": "public.app-category.productivity",
      "entitlements": "build/entitlements.mac.plist",
      "hardenedRuntime": true,
      "gatekeeperAssess": false
    },
    "dmg": {
      "sign": false
    },
    "win": {
      "target": "nsis"
    },
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        },
        {
          "target": "deb",
          "arch": ["x64"]
        }
      ],
      "category": "Utility"
    }
  }
}
```

**New Build Scripts:**

```json
{
  "scripts": {
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux",
    "build:all": "electron-builder --win --mac --linux"
  }
}
```

**macOS Signing Requirements:**
- For distribution outside Mac App Store: Developer ID certificate
- For local testing: `codesign --force --deep --sign - /path/to/app.app`
- `hardenedRuntime` and entitlements needed for modern macOS

---

## 6. Implementation Phases

### Phase 1: Foundation (1-2 days)
1. Create service factory and platform abstraction (`src/main/services/index.ts`)
2. Extract IconService from Windows ProcessService
3. Make `winreg` an optional dependency
4. Ensure Windows build still works after refactoring

### Phase 2: macOS ProcessService (2-3 days)
1. Implement `ProcessService.darwin.ts` with `ps` + `osascript`
2. Create macOS-specific process exclusions
3. Test process scanning on macOS
4. Implement app launching with `open` command

### Phase 3: macOS AutoStartService (1 day)
1. Implement LaunchAgent plist generation
2. Implement `launchctl` load/unload commands
3. Test auto-start enable/disable

### Phase 4: macOS IconService (1-2 days)
1. Implement `.app` bundle icon extraction
2. Handle ICNS to PNG conversion with `sips`
3. Test icon extraction for common apps

### Phase 5: macOS Build & Package (1 day)
1. Update electron-builder config
2. Create entitlements plist
3. Test DMG creation and installation
4. Test on both Intel and Apple Silicon Macs

### Phase 6: Linux Implementation (3-4 days)
Apply lessons learned from macOS to implement Linux services using `/proc` filesystem and `.desktop` files.

### Phase 7: Testing & Polish (2 days)
Cross-platform testing, CI/CD setup for multi-platform builds.

---

## 7. Platform Comparison Summary

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| Process Scanning | WMIC | ps + osascript | /proc filesystem |
| Process Check | tasklist | pgrep | pgrep / proc |
| App Launch | cmd /c start | open command | xdg-open / direct |
| Icon Extraction | PowerShell/.NET | sips + .app bundle | .desktop files |
| Auto-Start | Registry | LaunchAgents | .desktop autostart |
| Path Separator | \\ | / | / |
| System Dirs | C:\Windows | /System, /usr | /usr, /etc |

---

## 8. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| macOS signing complexity | Start with ad-hoc signing for testing |
| osascript performance | Cache app info, limit concurrent calls |
| Linux distribution differences | Target Ubuntu LTS first, expand later |
| Native module issues | Keep dependencies minimal, use shell commands |
| Platform detection bugs | Add comprehensive logging, test on VMs |

---

## 9. Success Criteria

- [ ] Windows build continues to work (no regression)
- [ ] macOS app scans and displays running applications
- [ ] macOS app can launch saved collections
- [ ] macOS auto-start works after login
- [ ] Icons display correctly for macOS apps
- [ ] DMG installer created successfully
- [ ] App runs on both Intel and Apple Silicon Macs
- [ ] Linux implementation follows macOS completion

---

**Next Step:** Ready to begin implementation. Use `superpowers:writing-plans` to create detailed technical tasks for Phase 1.
