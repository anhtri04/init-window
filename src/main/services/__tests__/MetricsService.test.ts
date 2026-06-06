import { describe, expect, it, vi } from 'vitest';
import { type Collection } from '../../../shared/types';
import { DarwinMetricsService } from '../MetricsService.darwin';
import { WindowsMetricsService } from '../MetricsService.windows';

const collection: Collection = {
  id: 'collection-1',
  name: 'Work',
  apps: [
    {
      id: 'app-1',
      name: 'Editor',
      path: 'C:\\Apps\\Editor\\editor.exe',
      icon: 'editor.png',
    },
    {
      id: 'app-2',
      name: 'Browser',
      path: 'C:\\Apps\\Browser\\browser.exe',
    },
  ],
  isAutoStart: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('DarwinMetricsService', () => {
  it('returns null when collection does not exist', async () => {
    const service = new DarwinMetricsService({ get: vi.fn(() => undefined) });

    await expect(service.getCollectionMetrics('missing')).resolves.toBeNull();
  });

  it('returns placeholder metrics for collection apps', async () => {
    const service = new DarwinMetricsService({ get: vi.fn(() => collection) });

    const result = await service.getCollectionMetrics('collection-1');

    expect(result).toMatchObject({
      collectionId: 'collection-1',
      totalApps: 2,
      runningApps: 0,
      totalCpuPercent: 0,
      totalMemoryMB: 0,
      longestUptimeSeconds: 0,
      apps: [
        {
          appId: 'app-1',
          name: 'Editor',
          path: 'C:\\Apps\\Editor\\editor.exe',
          icon: 'editor.png',
          isRunning: false,
          processCount: 0,
          cpuPercent: 0,
          memoryMB: 0,
          pidList: [],
        },
        {
          appId: 'app-2',
          name: 'Browser',
          path: 'C:\\Apps\\Browser\\browser.exe',
          isRunning: false,
          processCount: 0,
          cpuPercent: 0,
          memoryMB: 0,
          pidList: [],
        },
      ],
    });
    expect(result?.updatedAt).toBeTruthy();
  });
});

describe('WindowsMetricsService', () => {
  it('returns null when collection does not exist', async () => {
    const service = new WindowsMetricsService({ get: vi.fn(() => undefined) }, vi.fn());

    await expect(service.getCollectionMetrics('missing')).resolves.toBeNull();
  });

  it('aggregates metrics for matching processes', async () => {
    const execCommand = vi.fn(async () => ({
      stdout: JSON.stringify([
        {
          processId: 100,
          name: 'editor.exe',
          executablePath: 'C:\\Apps\\Editor\\editor.exe',
          creationDate: new Date(Date.now() - 30_000).toISOString(),
          workingSetSize: 104857600,
          cpuPercent: 1.25,
          elapsedTime: 30,
        },
        {
          processId: 101,
          name: 'editor-helper.exe',
          executablePath: 'C:\\Apps\\Editor\\editor.exe',
          creationDate: new Date(Date.now() - 60_000).toISOString(),
          workingSetSize: 52428800,
          cpuPercent: 2.35,
          elapsedTime: 60,
        },
        {
          processId: 200,
          name: 'browser.exe',
          workingSetSize: 20971520,
          cpuPercent: 0.5,
          elapsedTime: 10,
        },
      ]),
      stderr: '',
    }));
    const service = new WindowsMetricsService({ get: vi.fn(() => collection) }, execCommand as any);

    const result = await service.getCollectionMetrics('collection-1');

    expect(result?.runningApps).toBe(2);
    expect(result?.totalCpuPercent).toBe(4.1);
    expect(result?.totalMemoryMB).toBe(170);
    expect(result?.apps[0]).toMatchObject({
      appId: 'app-1',
      isRunning: true,
      processCount: 2,
      cpuPercent: 3.6,
      memoryMB: 150,
      pidList: [100, 101],
    });
    expect(result?.apps[0].startedAt).toBeTruthy();
    expect(result?.apps[0].uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(result?.apps[1]).toMatchObject({
      appId: 'app-2',
      isRunning: true,
      processCount: 1,
      cpuPercent: 0.5,
      memoryMB: 20,
      uptimeSeconds: 10,
      pidList: [200],
    });
    expect(result?.longestUptimeSeconds).toBeGreaterThanOrEqual(10);
  });

  it('handles empty PowerShell output', async () => {
    const execCommand = vi.fn(async () => ({ stdout: '   ', stderr: '' }));
    const service = new WindowsMetricsService({ get: vi.fn(() => collection) }, execCommand as any);

    const result = await service.getCollectionMetrics('collection-1');

    expect(result?.runningApps).toBe(0);
    expect(result?.apps.every((app) => !app.isRunning)).toBe(true);
  });
});
