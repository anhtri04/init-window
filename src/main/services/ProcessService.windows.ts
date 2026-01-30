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
