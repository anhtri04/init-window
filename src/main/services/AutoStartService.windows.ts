import { app, type App as ElectronApp } from 'electron';
import { AutoStartService } from './AutoStartService.interface';

export class WindowsAutoStartService implements AutoStartService {
  constructor(private electronApp: ElectronApp = app) {}

  async enable(): Promise<void> {
    this.electronApp.setLoginItemSettings({
      openAtLogin: true,
      args: ['--auto-start'],
      path: this.electronApp.getPath('exe'),
    });
  }

  async disable(): Promise<void> {
    this.electronApp.setLoginItemSettings({
      openAtLogin: false,
    });
  }

  async isEnabled(): Promise<boolean> {
    const settings = this.electronApp.getLoginItemSettings({
      args: ['--auto-start'],
      path: this.electronApp.getPath('exe'),
    });
    return settings.openAtLogin;
  }
}

export const autoStartService = new WindowsAutoStartService();
