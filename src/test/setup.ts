import { vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    setLoginItemSettings: vi.fn(),
    getLoginItemSettings: vi.fn(() => ({ openAtLogin: false })),
    getPath: vi.fn(() => 'C:\\Program Files\\Init Window\\init-window.exe'),
  },
  globalShortcut: {
    register: vi.fn(() => true),
    unregisterAll: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
  },
  BrowserWindow: vi.fn(),
}));

vi.mock('electron-store', () => {
  class MockStore {
    private data: Record<string, unknown> = {};

    constructor(options?: { schema?: Record<string, { default?: unknown }> }) {
      for (const [key, value] of Object.entries(options?.schema ?? {})) {
        this.data[key] = value.default;
      }
    }

    get(key: string, defaultValue?: unknown) {
      return this.data[key] ?? defaultValue;
    }

    set(key: string, value: unknown) {
      this.data[key] = value;
    }
  }

  return { default: MockStore };
});
