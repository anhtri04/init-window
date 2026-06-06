import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../../shared/types';
import { WindowsProcessService } from '../ProcessService.windows';

function createChildProcess() {
  const child = new EventEmitter() as EventEmitter & { unref: ReturnType<typeof vi.fn> };
  child.unref = vi.fn();
  return child;
}

describe('WindowsProcessService', () => {
  it('scans, filters, deduplicates, and sorts running processes', async () => {
    const execCommand = vi.fn(async () => ({
      stdout: [
        'Node,ExecutablePath,Name',
        'PC,C:\\Apps\\Beta\\beta_helper.exe,beta_helper.exe',
        'PC,C:\\Apps\\Beta\\beta.exe,beta.exe',
        'PC,C:\\Windows\\System32\\system-tool.exe,system-tool.exe',
        'PC,C:\\Apps\\Alpha\\alpha.exe,alpha.exe',
      ].join('\n'),
      stderr: '',
    }));
    const service = new WindowsProcessService({
      execCommand: execCommand as any,
      fileSystem: { existsSync: vi.fn(() => true), mkdirSync: vi.fn() },
      storage: {
        getSettings: vi.fn(() => ({
          ...DEFAULT_SETTINGS,
          excludedProcessNames: ['alpha.exe'],
        })),
      },
      iconCacheDir: 'C:\\IconCache',
    });

    const apps = await service.scanRunningProcesses();

    expect(apps).toHaveLength(1);
    expect(apps[0]).toMatchObject({
      name: 'beta',
      path: 'C:\\Apps\\Beta\\beta.exe',
    });
    expect(apps[0].icon).toContain('C:\\IconCache');
  });

  it('returns true when tasklist includes the executable name', async () => {
    const execCommand = vi.fn(async () => ({ stdout: 'editor.exe 123 Console', stderr: '' }));
    const service = new WindowsProcessService({ execCommand: execCommand as any });

    await expect(service.isProcessRunning('C:\\Apps\\Editor\\editor.exe')).resolves.toBe(true);
  });

  it('returns false when process lookup fails', async () => {
    const execCommand = vi.fn(async () => {
      throw new Error('tasklist failed');
    });
    const service = new WindowsProcessService({ execCommand: execCommand as any });

    await expect(service.isProcessRunning('C:\\Apps\\Editor\\editor.exe')).resolves.toBe(false);
  });

  it('launches apps using cmd start', async () => {
    const child = createChildProcess();
    const spawnProcess = vi.fn(() => child);
    const service = new WindowsProcessService({ spawnProcess: spawnProcess as any });
    const launched = service.launchApp('C:\\Apps\\Editor\\editor.exe');

    child.emit('spawn');

    await expect(launched).resolves.toBeUndefined();
    expect(spawnProcess).toHaveBeenCalledWith('cmd', ['/c', 'start', '', 'C:\\Apps\\Editor\\editor.exe'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    expect(child.unref).toHaveBeenCalled();
  });

  it('shuts down all matching process IDs', async () => {
    const execCommand = vi
      .fn()
      .mockResolvedValueOnce({ stdout: '[100,101]', stderr: '' })
      .mockResolvedValue({ stdout: '', stderr: '' });
    const service = new WindowsProcessService({ execCommand: execCommand as any });

    await service.shutDownApp('C:\\Apps\\Editor\\editor.exe');

    expect(execCommand).toHaveBeenCalledTimes(3);
    expect(execCommand).toHaveBeenCalledWith('taskkill /PID 100 /T /F', { timeout: 10000 });
    expect(execCommand).toHaveBeenCalledWith('taskkill /PID 101 /T /F', { timeout: 10000 });
  });

  it('returns cached icon without executing PowerShell', async () => {
    const execCommand = vi.fn();
    const service = new WindowsProcessService({
      execCommand: execCommand as any,
      fileSystem: { existsSync: vi.fn(() => true), mkdirSync: vi.fn() },
      iconCacheDir: 'C:\\IconCache',
    });

    const icon = await service.extractIcon('C:\\Apps\\Editor\\editor.exe');

    expect(icon).toContain('C:\\IconCache');
    expect(execCommand).not.toHaveBeenCalled();
  });
});
