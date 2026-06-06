import { globalShortcut, BrowserWindow } from 'electron';

export class GlobalShortcutService {
  private mainWindow: BrowserWindow | null = null;

  constructor(private shortcuts: Pick<typeof globalShortcut, 'register' | 'unregisterAll'> = globalShortcut) {}

  init(window: BrowserWindow) {
    this.mainWindow = window;

    const registered = this.shortcuts.register('CommandOrControl+Shift+W', () => {
      this.showWindow();
    });

    if (!registered) {
      console.error('Failed to register global shortcut Ctrl+Shift+W');
    }
  }

  showWindow() {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  destroy() {
    this.shortcuts.unregisterAll();
  }
}

export const globalShortcutService = new GlobalShortcutService();