import { describe, expect, it, vi } from 'vitest';
import { GlobalShortcutService } from '../GlobalShortcutService';

function createWindow(isMinimized = false) {
  return {
    isMinimized: vi.fn(() => isMinimized),
    restore: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
  };
}

describe('GlobalShortcutService', () => {
  it('registers shortcut and shows the window when triggered', () => {
    let callback: (() => void) | undefined;
    const shortcuts = {
      register: vi.fn((_accelerator: string, cb: () => void) => {
        callback = cb;
        return true;
      }),
      unregisterAll: vi.fn(),
    };
    const window = createWindow(true);
    const service = new GlobalShortcutService(shortcuts);

    service.init(window as any);
    callback?.();

    expect(shortcuts.register).toHaveBeenCalledWith('CommandOrControl+Shift+W', expect.any(Function));
    expect(window.restore).toHaveBeenCalled();
    expect(window.show).toHaveBeenCalled();
    expect(window.focus).toHaveBeenCalled();
  });

  it('does not restore a window that is not minimized', () => {
    const shortcuts = {
      register: vi.fn(() => true),
      unregisterAll: vi.fn(),
    };
    const window = createWindow(false);
    const service = new GlobalShortcutService(shortcuts);

    service.init(window as any);
    service.showWindow();

    expect(window.restore).not.toHaveBeenCalled();
    expect(window.show).toHaveBeenCalled();
    expect(window.focus).toHaveBeenCalled();
  });

  it('unregisters all shortcuts on destroy', () => {
    const shortcuts = {
      register: vi.fn(() => true),
      unregisterAll: vi.fn(),
    };
    const service = new GlobalShortcutService(shortcuts);

    service.destroy();

    expect(shortcuts.unregisterAll).toHaveBeenCalled();
  });
});
