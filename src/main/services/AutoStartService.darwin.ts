import { app, type App as ElectronApp } from 'electron';
import { AutoStartService } from './AutoStartService.interface';

export class DarwinAutoStartService implements AutoStartService {
  constructor(private electronApp: ElectronApp = app) {}

  async enable(): Promise<void> {
    try {
      // Use Electron's built-in API for macOS login items
      // This creates a LaunchAgent plist in ~/Library/LaunchAgents/
      this.electronApp.setLoginItemSettings({
        openAtLogin: true,
        openAsHidden: true, // Open in background (tray mode)
        args: ['--auto-start'],
      });
      console.log('[AutoStart] Enabled auto-start for macOS');
    } catch (error) {
      console.error('[AutoStart] Failed to enable auto-start:', error);
      throw error;
    }
  }

  async disable(): Promise<void> {
    try {
      // Disable auto-start by setting openAtLogin to false
      this.electronApp.setLoginItemSettings({
        openAtLogin: false,
      });
      console.log('[AutoStart] Disabled auto-start for macOS');
    } catch (error) {
      console.error('[AutoStart] Failed to disable auto-start:', error);
      throw error;
    }
  }

  async isEnabled(): Promise<boolean> {
    try {
      // Check the current login item settings
      const settings = this.electronApp.getLoginItemSettings();
      return settings.openAtLogin;
    } catch (error) {
      console.error('[AutoStart] Failed to check auto-start status:', error);
      return false;
    }
  }
}

export const autoStartService = new DarwinAutoStartService();
