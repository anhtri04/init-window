import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { App, AppSettings } from '../../shared/types';
import { ProcessService } from './ProcessService.interface';
import { storageService } from './StorageService';

const execAsync = promisify(exec);

// Directory for cached app icons
const ICON_CACHE_DIR = path.join(os.tmpdir(), 'init-window-icons');

// System processes to exclude (by name)
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
  'electron.exe', 'init-window.exe', 'AsusOptimizationStartupTask', 'esbuild.exe',
  'WidgetService', 'Widgets', 'gopls', 'AppActions',
]);

// System paths to exclude (processes from these directories are typically Windows internals)
const EXCLUDED_PATHS = [
  'C:\\Windows\\System32',
  'C:\\Windows\\SysWOW64',
  'C:\\Windows\\WinSxS',
  'C:\\Windows\\explorer.exe', // Explorer is a special case - it's the shell
];

class WindowsProcessService implements ProcessService {
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
      const userSettings = storageService.getSettings();

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
        if (!fs.existsSync(executablePath)) continue;

        // Apply hybrid exclusion filtering
        if (this.isExcludedProcess(name, executablePath, userSettings)) {
          continue;
        }

        // Dedupe by path
        if (!processMap.has(executablePath)) {
          processMap.set(executablePath, {
            id: uuidv4(),
            name: path.basename(name, '.exe'),
            path: executablePath,
            icon: undefined, // Will be populated below
          });
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
      console.log(`[launchApp] Starting: ${executablePath}`);

      const child = spawn('cmd', ['/c', 'start', '', executablePath], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
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

export const processService = new WindowsProcessService();
