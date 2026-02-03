import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import path from 'path';
import { collectionService } from '../services/CollectionService';

// Create a simple 16x16 icon buffer (blue square with "I" text)
function createDefaultIcon(): typeof nativeImage.createFromBuffer extends (...args: any[]) => infer R ? R : never {
  // Simple 16x16 PNG-like approach - create from buffer
  // This creates a simple colored square icon
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);

  // Fill with blue color
  for (let i = 0; i < size * size; i++) {
    const offset = i * 4;
    buffer[offset] = 59;     // R (blue-500)
    buffer[offset + 1] = 130; // G
    buffer[offset + 2] = 246; // B
    buffer[offset + 3] = 255; // A
  }

  // Draw a simple "I" letter in white
  for (let y = 3; y < 13; y++) {
    for (let x = 7; x < 9; x++) {
      const offset = (y * size + x) * 4;
      buffer[offset] = 255;     // R
      buffer[offset + 1] = 255; // G
      buffer[offset + 2] = 255; // B
    }
  }

  // Top and bottom bars of "I"
  for (let x = 5; x < 11; x++) {
    // Top
    let offset = (3 * size + x) * 4;
    buffer[offset] = 255;
    buffer[offset + 1] = 255;
    buffer[offset + 2] = 255;
    // Bottom
    offset = (12 * size + x) * 4;
    buffer[offset] = 255;
    buffer[offset + 1] = 255;
    buffer[offset + 2] = 255;
  }

  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

class TrayManager {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;

  init(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;

    // Create tray icon - use app.getAppPath() for reliable path resolution
    const iconPath = path.join(app.getAppPath(), 'assets', 'icon.ico');
    let icon: ReturnType<typeof nativeImage.createFromPath>;

    try {
      icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        icon = createDefaultIcon();
      }
    } catch {
      icon = createDefaultIcon();
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip('Init Window');

    // Left click: toggle window
    this.tray.on('click', () => {
      this.toggleWindow();
    });

    // Initial menu
    this.updateMenu();
  }

  updateMenu() {
    if (!this.tray) return;

    const collections = collectionService.list();

    const collectionItems: Electron.MenuItemConstructorOptions[] = collections.map((c) => ({
      label: `▶ ${c.name}${c.isAutoStart ? ' ★' : ''}`,
      click: async () => {
        await collectionService.run(c.id);
      },
    }));

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Collections',
        submenu: [
          ...collectionItems,
          ...(collectionItems.length > 0 ? [{ type: 'separator' as const }] : []),
          {
            label: 'Manage Collections...',
            click: () => this.showWindow(),
          },
        ],
      },
      { type: 'separator' },
      {
        label: 'Open Init Window',
        click: () => this.showWindow(),
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        },
      },
    ];

    const contextMenu = Menu.buildFromTemplate(template);
    this.tray.setContextMenu(contextMenu);
  }

  private toggleWindow() {
    if (!this.mainWindow) return;

    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide();
    } else {
      this.showWindow();
    }
  }

  private showWindow() {
    if (!this.mainWindow) return;
    this.mainWindow.show();
    this.mainWindow.focus();
  }

  destroy() {
    this.tray?.destroy();
    this.tray = null;
  }
}

export const trayManager = new TrayManager();
