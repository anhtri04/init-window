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

      this.regKey.set(APP_NAME, Registry.REG_SZ, command, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async disable(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.regKey.remove(APP_NAME, (err: Error | null) => {
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
      this.regKey.get(APP_NAME, (err: Error | null, item: any) => {
        resolve(!err && item !== null);
      });
    });
  }
}

export const autoStartService = new WindowsAutoStartService();
