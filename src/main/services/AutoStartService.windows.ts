import { app } from 'electron';
import { AutoStartService } from './AutoStartService.interface';

class WindowsAutoStartService implements AutoStartService {
  async enable(): Promise<void> {
    app.setLoginItemSettings({
      openAtLogin: true,
      args: ['--auto-start'],
      path: app.getPath('exe'),
    });
  }

  async disable(): Promise<void> {
    app.setLoginItemSettings({
      openAtLogin: false,
    });
  }

  async isEnabled(): Promise<boolean> {
    const settings = app.getLoginItemSettings({
      args: ['--auto-start'],
      path: app.getPath('exe'),
    });
    return settings.openAtLogin;
  }
}

export const autoStartService = new WindowsAutoStartService();
