import { EventEmitter } from 'events';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../../shared/types';
import { DarwinProcessService } from '../ProcessService.darwin';

function createChildProcess() {
  const child = new EventEmitter() as EventEmitter & { unref: ReturnType<typeof vi.fn> };
  child.unref = vi.fn();
  return child;
}

function fileSystem() {
  return {
    existsSync: vi.fn((_path: string) => true),
    mkdirSync: vi.fn(),
    promises: {
      access: vi.fn(async () => undefined),
    },
    constants: {
      F_OK: 0,
    },
  };
}

describe('DarwinProcessService', () => {
  it('scans app bundle processes and filters user exclusions', async () => {
    const execCommand = vi.fn(async () => ({
      stdout: [
        '/Applications/Beta.app/Contents/MacOS/Beta /Applications/Beta.app/Contents/MacOS/Beta',
        '/Applications/Alpha.app/Contents/MacOS/Alpha /Applications/Alpha.app/Contents/MacOS/Alpha',
        '/usr/bin/zsh /usr/bin/zsh',
      ].join('\n'),
      stderr: '',
    }));
    const service = new DarwinProcessService({
      execCommand: execCommand as any,
      fileSystem: fileSystem() as any,
      storage: {
        getSettings: vi.fn(() => ({
          ...DEFAULT_SETTINGS,
          excludedPaths: ['/Applications/Alpha.app'],
        })),
      },
      iconCacheDir: '/tmp/init-window-icons',
    });

    const apps = await service.scanRunningProcesses();

    expect(apps).toHaveLength(1);
    expect(apps[0]).toMatchObject({
      name: 'Beta',
      path: '/Applications/Beta.app',
    });
  });

  it('checks running app status with pgrep', async () => {
    const execCommand = vi.fn(async () => ({ stdout: '1\n', stderr: '' }));
    const service = new DarwinProcessService({ execCommand: execCommand as any });

    await expect(service.isProcessRunning('/Applications/Beta.app')).resolves.toBe(true);
  });

  it('launches app bundles with open -n', async () => {
    const child = createChildProcess();
    const spawnProcess = vi.fn(() => child);
    const service = new DarwinProcessService({ spawnProcess: spawnProcess as any });
    const launched = service.launchApp('/Applications/Beta.app');

    child.emit('spawn');

    await expect(launched).resolves.toBeUndefined();
    expect(spawnProcess).toHaveBeenCalledWith('open', ['-n', '/Applications/Beta.app'], {
      detached: true,
      stdio: 'ignore',
    });
    expect(child.unref).toHaveBeenCalled();
  });

  it('ignores pkill exit code 1 when shutting down missing processes', async () => {
    const execCommand = vi.fn(async () => {
      const error = new Error('no process') as Error & { code: number };
      error.code = 1;
      throw error;
    });
    const service = new DarwinProcessService({ execCommand: execCommand as any });

    await expect(service.shutDownApp('/Applications/Beta.app')).resolves.toBeUndefined();
  });

  it('does not extract icons for non-app paths', async () => {
    const service = new DarwinProcessService();

    await expect(service.extractIcon('/usr/local/bin/tool')).resolves.toBeUndefined();
  });
});
