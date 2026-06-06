import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app as electronApp } from 'electron';
import { DarwinAutoStartService } from '../AutoStartService.darwin';
import { WindowsAutoStartService } from '../AutoStartService.windows';

const app = vi.mocked(electronApp);

describe('WindowsAutoStartService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    app.getPath.mockReturnValue('C:\\Program Files\\Init Window\\init-window.exe');
  });

  it('enables login item with auto-start args and executable path', async () => {
    const service = new WindowsAutoStartService(app);

    await service.enable();

    expect(app.setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
      args: ['--auto-start'],
      path: 'C:\\Program Files\\Init Window\\init-window.exe',
    });
  });

  it('disables login item', async () => {
    const service = new WindowsAutoStartService(app);

    await service.disable();

    expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: false });
  });

  it('returns login item enabled status', async () => {
    app.getLoginItemSettings.mockReturnValueOnce({ openAtLogin: true } as Electron.LoginItemSettings);
    const service = new WindowsAutoStartService(app);

    await expect(service.isEnabled()).resolves.toBe(true);
  });
});

describe('DarwinAutoStartService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables hidden login item with auto-start args', async () => {
    const service = new DarwinAutoStartService(app);

    await service.enable();

    expect(app.setLoginItemSettings).toHaveBeenCalledWith({
      openAtLogin: true,
      openAsHidden: true,
      args: ['--auto-start'],
    });
  });

  it('disables login item', async () => {
    const service = new DarwinAutoStartService(app);

    await service.disable();

    expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: false });
  });

  it('returns false when status check throws', async () => {
    app.getLoginItemSettings.mockImplementationOnce(() => {
      throw new Error('Unavailable');
    });
    const service = new DarwinAutoStartService(app);

    await expect(service.isEnabled()).resolves.toBe(false);
  });
});
