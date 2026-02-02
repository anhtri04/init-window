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
  // Core Windows System Processes
  'system', 'registry', 'smss.exe', 'csrss.exe', 'wininit.exe',
  'services.exe', 'lsass.exe', 'lsaiso.exe', 'svchost.exe', 'fontdrvhost.exe',
  'dwm.exe', 'sihost.exe', 'taskhostw.exe', 'ctfmon.exe',
  'winlogon.exe', 'userinit.exe', 'logonui.exe', 'wlanext.exe',
  
  // Windows Shell & UI Components
  'explorer.exe', 'runtimebroker.exe', 'shellexperiencehost.exe',
  'searchui.exe', 'searchapp.exe', 'startmenuexperiencehost.exe',
  'textinputhost.exe', 'applicationframehost.exe', 'systemsettings.exe',
  'lockapp.exe', 'taskmgr.exe', 'mobsync.exe', 'werfault.exe',
  'werfaultsecure.exe', 'wermgr.exe', 'wudfhost.exe',
  
  // Windows Search & Indexing
  'searchindexer.exe', 'searchprotocolhost.exe', 'searchfilterhost.exe',
  
  // Windows Security & Updates
  'securityhealthservice.exe', 'securityhealthsystray.exe', 'sgrmbroker.exe',
  'msmpeng.exe', 'antimalwareservice.exe', 'nissrv.exe', 'mpcmdrun.exe',
  'trustedinstaller.exe', 'tiworker.exe', 'wuauclt.exe', 'usoclient.exe',
  'musnotification.exe', 'musnotificationux.exe',
  
  // Windows Services & Background Tasks
  'spoolsv.exe', 'dashost.exe', 'wmiprvse.exe', 'msdtc.exe',
  'vdsldr.exe', 'vds.exe', 'msiexec.exe', 'audiodg.exe',
  'conhost.exe', 'dllhost.exe', 'backgroundtaskhost.exe',
  'backgroundtransferhost.exe', 'mobsync.exe', 'wsqmcons.exe',
  'compattelrunner.exe', 'deviceenroller.exe', 'devicecensus.exe',
  
  // Windows Widgets & Notifications
  'widgetservice.exe', 'widgets.exe', 'notificationcontrollerps.exe',
  'actioncenter.exe', 'useroobebroker.exe',
  
  // Command Line & Scripting
  'cmd.exe', 'powershell.exe', 'powershell_ise.exe', 'pwsh.exe',
  'windowsterminal.exe', 'wt.exe', 'bash.exe', 'wsl.exe', 'wslhost.exe',
  
  // Development Tools (typically background processes)
  'node.exe', 'electron.exe', 'git.exe', 'git-credential-manager.exe',
  'openssh.exe', 'ssh.exe', 'ssh-agent.exe', 'esbuild.exe',
  'gopls.exe', 'typescript.exe', 'tsc.exe',
  
  // Microsoft Store & Apps
  'winstore.app.exe', 'wsappx.exe', 'wwahost.exe', 'appinstaller.exe',
  
  // Windows Telemetry & Diagnostics
  'telemetryservice.exe', 'diagtrack.exe', 'utcsvc.exe',
  
  // Graphics & Display
  'nvcontainer.exe', 'nvdisplay.container.exe', 'nvprofileupdater.exe',
  'igfxem.exe', 'igfxtray.exe', 'hkcmd.exe', 'igfxpers.exe',
  'amdrsserv.exe', 'atiesrxx.exe', 'atieclxx.exe', 'radeoninstaller.exe',
  
  // Audio Services
  'audiodg.exe', 'audiosrv.exe', 'nahimicservice.exe', 'realtekaudiosvc.exe',
  
  // OEM Background Services (common manufacturers)
  'asusoptimizationstartuptask.exe', 'asus.exe', 'asusswitch.exe',
  'hpwuschd2.exe', 'hpsf.exe', 'hptouchpointmanager.exe',
  'lenovowelcome.exe', 'lenovoutility.exe', 'lenovovantageservice.exe',
  'dellsupportassist.exe', 'dellsupportassistagent.exe',
  
  // This Application
  'init-window.exe',
  
  // Other Common Background Processes
  'appactions.exe', 'gamebarpresencewriter.exe', 'gamebar.exe',
  'xboxstat.exe', 'xboxapp.exe', 'gamingservices.exe',
  'phoneexperiencehost.exe', 'yourphone.exe', 'yourphoneserver.exe',
  'microsoftedgeupdate.exe', 'msedge.exe', 'msedgewebview2.exe',
  'onedrive.exe', 'onedrivestandaloneupdater.exe', 'filecoauth.exe',
]);

// System paths to exclude (processes from these directories are typically Windows internals)
const EXCLUDED_PATHS = [
  'C:\\Windows\\System32',
  'C:\\Windows\\SysWOW64',
  'C:\\Windows\\WinSxS',
  'C:\\Windows\\explorer.exe', // Explorer is a special case - it's the shell
];

class WindowsProcessService implements ProcessService {
    /**
   * Normalize app name by removing common suffixes for helper processes
   * This helps group related processes (e.g., "chrome" and "chrome_helper" both become "chrome")
   */
  private normalizeAppName(name: string): string {
    const lowerName = name.toLowerCase().replace('.exe', '');
    
    // Remove common helper/service suffixes
    const suffixes = [
      '_helper', '_app', '_service', '_background', '_crashpad',
      '_gpu', '_renderer', '_plugin', '_broker', '_updater',
      '_installer', '_launcher', '_agent', '_daemon', '_worker',
      'helper', 'service', 'updater', 'launcher'
    ];
    
    for (const suffix of suffixes) {
      if (lowerName.endsWith(suffix)) {
        return lowerName.slice(0, -suffix.length);
      }
    }
    
    return lowerName;
  }

  /**
   * Determine if an executable is likely the "main" process vs a helper
   * Main processes are prioritized when deduplicating
   */
  private isMainExecutable(name: string): boolean {
    const lowerName = name.toLowerCase();
    
    // Helper/background process indicators
    const helperIndicators = [
      'helper', 'crashpad', 'gpu', 'renderer', 'plugin',
      'broker', 'updater', 'installer', 'agent', 'daemon',
      'worker', 'background', 'service'
    ];
    
    return !helperIndicators.some(indicator => lowerName.includes(indicator));
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

        // Use parent directory as the deduplication key
        // Processes from the same app are typically in the same folder
        const parentDir = path.dirname(executablePath).toLowerCase();
        const isMain = this.isMainExecutable(name);

        // Smart deduplication: group by parent directory
        const existing = processMap.get(parentDir);
        
        if (!existing) {
          // First time seeing an app from this directory, add it
          processMap.set(parentDir, {
            id: uuidv4(),
            name: path.basename(name, '.exe'),
            path: executablePath,
            icon: undefined, // Will be populated below
          });
        } else {
          // Already have an app from this directory - only replace if current is "more main"
          const existingIsMain = this.isMainExecutable(existing.name);
          
          // Replace if: current is main AND existing is not main
          if (isMain && !existingIsMain) {
            processMap.set(parentDir, {
              id: uuidv4(),
              name: path.basename(name, '.exe'),
              path: executablePath,
              icon: undefined,
            });
          }
          // Otherwise keep the existing one (skip this duplicate)
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
