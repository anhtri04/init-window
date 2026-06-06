import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { App, AppSettings } from '../../shared/types';
import { ProcessService } from './ProcessService.interface';
import { storageService, StorageService } from './StorageService';

const execAsync = promisify(exec);

// Directory for cached app icons (macOS standard cache location)
const ICON_CACHE_DIR = path.join(os.homedir(), 'Library', 'Caches', 'init-window-icons');

// System processes to exclude (by name) - macOS specific
const EXCLUDED_PROCESSES = new Set([
  // Core macOS System Processes
  'kernel', 'launchd', 'kextd', 'notifyd', 'watchdogd',
  'configd', 'notifyd', 'distnoted', 'opendirectoryd',
  'securityd', 'appleeventsd', 'coreaudiod', 'powerd',
  'thermald', 'airportd', 'bluetoothd', 'locationd',
  'networkserviceproxy', 'networksetup', 'socketfilterfw',
  'syspolicyd', 'systemintegrityprotectiond', 'tccd',
  'universalaccessd', 'usbd', 'volumes', 'windowserver',
  'loginwindow', 'dock', 'finder', 'systemuiserver',
  'controlstrip', 'touchbarserver', 'siri', 'spotlight',
  'mds', 'mdworker', 'mdworker_shared', 'mds_stores',
  'coreauthd', 'cloudd', 'cloudphotosd', 'photolibraryd',
  'akd', 'accounts.d', 'callhistoryd', 'callhistorysynchelper',
  'revisiond', 'secd', 'securityagent', 'seagatedashboard',
  'suhelper', 'softwareupdated', 'system.installd', 'installd',
  'msupdatecheck', 'trustedbsd', 'kcm', 'kdc', 'kxld',
  'ocspd', 'sysextd', 'systemextensionsctl', 'systemextensionsd',

  // macOS Background Services
  'apsd', 'bdeserver', 'bluetoothd', 'cfprefsd', 'cupsd',
  'cvmserver', 'dasd', 'diskarbitrationd', 'filecoordinationd',
  'fileproviderd', 'iconservicesagent', 'iconservicesd',
  'kernel_task', 'kext_cache', 'kextd', 'launchservicesd',
  'logd', 'lsd', 'mDNSResponder', 'mds_stores', 'mediaremoted',
  'notifyd', 'nsurlsessiond', 'nsurlstoraged', 'sandboxd',
  'sharedfilelistd', 'sntp', 'sshd', 'suhelper', 'syslogd',
  'trustd', 'ubd', 'usbmuxd', 'vsdbutil', 'wdextd',

  // WindowServer & Graphics
  'windowserver', 'hidd', 'corebrightnessd', 'corecaptured',
  'diagnosticd', 'gpuv2', 'intelbras', 'nvramagent',
  'screencapture', 'screencaptured', 'screencapturekit',
  'skylight', 'vmware-vmx', 'vmware-vmx-debug',

  // Terminal & Shell
  'bash', 'sh', 'zsh', 'fish', 'tcsh', 'csh', 'ksh',
  'dash', 'tmux', 'screen', 'script', 'login',

  // Development Tools
  'node', 'electron', 'code', 'code.helper',
  'git', 'python', 'python3', 'ruby', 'perl',
  'php', 'php-fpm', 'java', 'javaw', 'docker',
  'docker-machine', 'docker-compose', 'kubectl',
  'esbuild', 'typescript-language-server', 'eslint',
  'prettier', 'webpack', 'vite', 'esbuild-darwin-64',

  // This Application
  'init-window',

  // Common Helper Processes
  'crashpad_handler', 'gpu-process', 'renderer',
  'service-worker', 'extension', 'plugin-container',
  'plugin.helper', 'helper.app', 'helper.gpu',
  'helper.renderer', 'helper.plugin', 'helper.app.bundle',
]);

// System paths to exclude (background/system services only, NOT user apps)
const EXCLUDED_PATHS = [
  // System binaries and frameworks (not user apps)
  '/System/Library',
  '/System/iOSSupport',
  '/System/Volumes',
  '/System/DriverKit',
  '/System/Cryptexes',
  '/usr/bin',
  '/usr/sbin',
  '/bin',
  '/sbin',
  '/usr/lib',
  '/usr/local/bin',
  '/usr/local/sbin',
  '/dev',
  '/private/var',
  '/var',
  '/Library/CoreMediaIO',
  '/Library/Frameworks',
  '/Library/Graphics',
  '/Library/Input Methods',
  '/Library/PrivilegedHelperTools',
  '/Library/Screen Savers',
  '/Library/Services',
  '/Library/Widgets',
];

// Common macOS app bundle directories
const APP_BUNDLE_PATHS = [
  '/Applications',
  '/System/Applications',
  path.join(os.homedir(), 'Applications'),
];

export interface DarwinProcessServiceDeps {
  execCommand?: typeof execAsync;
  spawnProcess?: typeof spawn;
  fileSystem?: Pick<typeof fs, 'existsSync' | 'mkdirSync' | 'promises' | 'constants'>;
  storage?: Pick<StorageService, 'getSettings'>;
  iconCacheDir?: string;
}

export class DarwinProcessService implements ProcessService {
  private execCommand: typeof execAsync;
  private spawnProcess: typeof spawn;
  private fileSystem: Pick<typeof fs, 'existsSync' | 'mkdirSync' | 'promises' | 'constants'>;
  private storage: Pick<StorageService, 'getSettings'>;
  private iconCacheDir: string;

  constructor(deps: DarwinProcessServiceDeps = {}) {
    this.execCommand = deps.execCommand ?? execAsync;
    this.spawnProcess = deps.spawnProcess ?? spawn;
    this.fileSystem = deps.fileSystem ?? fs;
    this.storage = deps.storage ?? storageService;
    this.iconCacheDir = deps.iconCacheDir ?? ICON_CACHE_DIR;
  }

  /**
   * Extract bundle path from executable path
   * e.g., /Applications/Firefox.app/Contents/MacOS/firefox -> /Applications/Firefox.app
   */
  private getBundlePath(executablePath: string): string | null {
    // Look for .app in the path
    const appMatch = executablePath.match(/(.+\.app)/);
    if (appMatch) {
      return appMatch[1];
    }
    return null;
  }

  /**
   * Get display name from bundle path
   * e.g., /Applications/Firefox.app -> Firefox
   */
  private getDisplayName(bundlePath: string): string {
    const bundleName = path.basename(bundlePath, '.app');
    return bundleName.replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * Check if an executable is likely the "main" process vs a helper
   */
  private isMainExecutable(executableName: string, bundlePath: string | null): boolean {
    const lowerName = executableName.toLowerCase();

    if (!bundlePath) {
      // Not in a bundle, check for helper patterns
      const helperIndicators = [
        'helper', 'crashpad', 'gpu', 'renderer', 'plugin',
        'broker', 'updater', 'installer', 'agent', 'daemon',
        'worker', 'background', 'service', 'container',
      ];
      return !helperIndicators.some(indicator => lowerName.includes(indicator));
    }

    // Inside a bundle - check if the executable name matches the bundle name
    const bundleName = path.basename(bundlePath, '.app').toLowerCase();
    const execBaseName = path.basename(lowerName, '.app');

    // Consider it main if the name closely matches the bundle
    return execBaseName === bundleName ||
           execBaseName === bundleName.replace(/\s/g, '').toLowerCase() ||
           execBaseName === bundleName.replace(/-/g, '').toLowerCase();
  }

  private isExcludedProcess(
    name: string,
    executablePath: string,
    userSettings: AppSettings
  ): boolean {
    const lowerName = name.toLowerCase();
    const lowerPath = executablePath.toLowerCase();

    // 1. Check hardcoded process name exclusions
    if (EXCLUDED_PROCESSES.has(lowerName)) {
      return true;
    }

    // 2. Check system path exclusions
    for (const excludedPath of EXCLUDED_PATHS) {
      if (lowerPath.startsWith(excludedPath.toLowerCase())) {
        return true;
      }
    }

    // 3. Check user-defined process name exclusions
    for (const excludedName of userSettings.excludedProcessNames ?? []) {
      if (lowerName === excludedName.toLowerCase()) {
        return true;
      }
    }

    // 4. Check user-defined path exclusions
    for (const excludedPath of userSettings.excludedPaths ?? []) {
      if (lowerPath.startsWith(excludedPath.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  async scanRunningProcesses(): Promise<App[]> {
    try {
      // Get user settings for exclusions
      const userSettings = this.storage.getSettings();

      // Use ps command to get all processes with their command lines
      // -e: all processes, -o: output format (comm=name, args=full command line)
      const { stdout } = await this.execCommand(
        'ps -eo comm=,args=',
        { maxBuffer: 10 * 1024 * 1024 }
      );

      const lines = stdout.trim().split('\n');
      const processMap = new Map<string, App>();

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Parse the line - first word is comm (process name), rest is args
        const spaceIndex = trimmedLine.indexOf(' ');
        const name = spaceIndex > 0 ? trimmedLine.substring(0, spaceIndex) : trimmedLine;
        const args = spaceIndex > 0 ? trimmedLine.substring(spaceIndex + 1) : '';

        if (!name) continue;

        // Extract executable path from args or use comm
        // On macOS, args usually contains the full path to the executable
        let executablePath = args.split(' ')[0] || name;

        // Clean up the path - remove common prefixes
        if (executablePath.startsWith('-')) {
          // Some processes show args starting with dash, use comm
          executablePath = name;
        }

        // Ensure it's an absolute path
        if (!executablePath.startsWith('/')) {
          executablePath = `/usr/bin/${name}`;
        }

        // Check if file exists
        try {
          await this.fileSystem.promises.access(executablePath, this.fileSystem.constants.F_OK);
        } catch {
          continue;
        }

        // Apply exclusion filtering
        if (this.isExcludedProcess(name, executablePath, userSettings)) {
          continue;
        }

        // Get bundle path if it's an app
        const bundlePath = this.getBundlePath(executablePath);
        
        // Only include processes that are:
        // 1. Inside a .app bundle (user apps), OR
        // 2. From /Applications or ~/Applications directories
        if (!bundlePath) {
          // Not a bundle - check if it's from a user applications directory
          const isUserApp = APP_BUNDLE_PATHS.some(appPath => 
            executablePath.toLowerCase().startsWith(appPath.toLowerCase())
          );
          if (!isUserApp) {
            continue; // Skip system daemons and non-app executables
          }
        }
        
        const displayPath = bundlePath || executablePath;

        // Use bundle path (or executable path) as deduplication key
        const parentDir = bundlePath
          ? path.dirname(bundlePath).toLowerCase()
          : path.dirname(executablePath).toLowerCase();

        const isMain = this.isMainExecutable(name, bundlePath);

        // Smart deduplication: group by parent directory
        const existing = processMap.get(parentDir);

        if (!existing) {
          // First time seeing an app from this directory, add it
          const displayName = bundlePath
            ? this.getDisplayName(bundlePath)
            : path.basename(name);

          processMap.set(parentDir, {
            id: uuidv4(),
            name: displayName,
            path: displayPath,
            icon: undefined, // Will use generic macOS icon
          });
        } else {
          // Already have an app from this directory - only replace if current is "more main"
          const existingIsMain = bundlePath
            ? this.isMainExecutable(path.basename(existing.path), bundlePath)
            : false;

          if (isMain && !existingIsMain) {
            const displayName = bundlePath
              ? this.getDisplayName(bundlePath)
              : path.basename(name);

            processMap.set(parentDir, {
              id: uuidv4(),
              name: displayName,
              path: displayPath,
              icon: undefined,
            });
          }
        }
      }

      const apps = Array.from(processMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      // Extract icons for all apps (in parallel for speed)
      await Promise.all(
        apps.map(async (app) => {
          app.icon = await this.extractIcon(app.path);
        })
      );

      return apps;
    } catch (error) {
      console.error('Failed to scan processes:', error);
      return [];
    }
  }

  async isProcessRunning(executablePath: string): Promise<boolean> {
    try {
      // Get the process name from the path
      const processName = path.basename(executablePath, '.app');

      // Use pgrep to check if process is running
      // -x: exact match, -c: count (0 if not running)
      const { stdout } = await this.execCommand(
        `pgrep -x "${processName}" | wc -l`
      );
      const count = parseInt(stdout.trim(), 10);
      return count > 0;
    } catch {
      return false;
    }
  }

  async launchApp(executablePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[launchApp] Starting: ${executablePath}`);

      // Check if it's an app bundle
      const isBundle = executablePath.endsWith('.app');

      let command: string;
      let args: string[];

      if (isBundle) {
        // Use open command for app bundles
        command = 'open';
        args = ['-n', executablePath];
      } else {
        // Direct executable - use spawn with detached process
        command = executablePath;
        args = [];
      }

      const child = this.spawnProcess(command, args, {
        detached: true,
        stdio: 'ignore',
      });

      child.on('error', (err) => {
        console.error(`[launchApp] Failed to spawn: ${executablePath}`, err);
        reject(err);
      });

      child.on('spawn', () => {
        console.log(`[launchApp] Spawned successfully: ${executablePath}`);
        child.unref();
        resolve();
      });

      child.on('exit', (code) => {
        if (code !== 0) {
          console.warn(`[launchApp] Process exited with code ${code}: ${executablePath}`);
        }
      });
    });
  }

  async shutDownApp(executablePath: string): Promise<void> {
    const escapedPath = executablePath.replace(/'/g, `'\\''`);

    try {
      await this.execCommand(`pkill -f '${escapedPath}'`, { timeout: 10000 });
      console.log(`[shutDownApp] Stopped process(es) for: ${executablePath}`);
    } catch (error: any) {
      // pkill exits with code 1 when no process matched.
      if (error?.code === 1) {
        console.log(`[shutDownApp] No running process found for: ${executablePath}`);
        return;
      }

      throw error;
    }
  }

  async extractIcon(executablePath: string): Promise<string | undefined> {
    try {
      // Only extract icons for app bundles
      if (!executablePath.endsWith('.app')) {
        return undefined;
      }

      // Ensure cache directory exists
      if (!this.fileSystem.existsSync(this.iconCacheDir)) {
        this.fileSystem.mkdirSync(this.iconCacheDir, { recursive: true });
      }

      // Create unique filename based on bundle path
      const hash = crypto.createHash('md5').update(executablePath).digest('hex');
      const iconPath = path.join(this.iconCacheDir, `${hash}.png`);

      // Return cached icon if already exists
      if (this.fileSystem.existsSync(iconPath)) {
        return iconPath;
      }

      // Get the icon name from Info.plist using plutil
      const infoPlistPath = path.join(executablePath, 'Contents', 'Info.plist');
      if (!this.fileSystem.existsSync(infoPlistPath)) {
        console.warn(`[extractIcon] Info.plist not found: ${infoPlistPath}`);
        return undefined;
      }

      // Extract CFBundleIconFile from Info.plist
      let iconName: string;
      try {
        const { stdout } = await this.execCommand(
          `plutil -extract CFBundleIconFile raw "${infoPlistPath}"`
        );
        iconName = stdout.trim();
        if (!iconName) {
          console.warn(`[extractIcon] No CFBundleIconFile in Info.plist: ${executablePath}`);
          return undefined;
        }
      } catch (error) {
        console.error(`[extractIcon] Failed to read Info.plist: ${executablePath}`, error);
        return undefined;
      }

      // Construct the .icns file path
      const icnsPath = path.join(executablePath, 'Contents', 'Resources', `${iconName}.icns`);
      if (!this.fileSystem.existsSync(icnsPath)) {
        // Try without .icns extension (some apps don't include it)
        const icnsPathNoExt = path.join(executablePath, 'Contents', 'Resources', iconName);
        if (!this.fileSystem.existsSync(icnsPathNoExt)) {
          console.warn(`[extractIcon] Icon file not found: ${icnsPath}`);
          return undefined;
        }
        // Use the path without extension
        const { stdout } = await this.execCommand(
          `sips -s format png "${icnsPathNoExt}" --out "${iconPath}"`
        );
        console.log(`[extractIcon] Converted icon (no ext): ${path.basename(executablePath)}`);
        return iconPath;
      }

      // Convert .icns to .png using sips
      const { stdout } = await this.execCommand(
        `sips -s format png "${icnsPath}" --out "${iconPath}"`
      );

      if (this.fileSystem.existsSync(iconPath)) {
        console.log(`[extractIcon] SUCCESS for: ${path.basename(executablePath)}`);
        return iconPath;
      } else {
        console.warn(`[extractIcon] Conversion failed for: ${executablePath}`);
        return undefined;
      }
    } catch (error) {
      console.error(`[extractIcon] Error extracting icon for ${executablePath}:`, error);
      return undefined;
    }
  }
}

export const processService = new DarwinProcessService();
