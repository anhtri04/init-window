import { describe, expect, it, vi } from 'vitest';
import { type App, type Collection } from '../../../shared/types';
import { CollectionService } from '../CollectionService';

const app: App = {
  id: 'app-1',
  name: 'Editor',
  path: 'C:\\Apps\\Editor\\editor.exe',
};

function collection(overrides: Partial<Collection> = {}): Collection {
  return {
    id: 'collection-1',
    name: 'Work',
    apps: [app],
    isAutoStart: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createService(initialCollections: Collection[] = []) {
  let collections = initialCollections;
  const storage = {
    getCollections: vi.fn(() => collections),
    saveCollections: vi.fn((next: Collection[]) => {
      collections = next;
    }),
  };
  const process = {
    isProcessRunning: vi.fn(async (_path: string) => false),
    launchApp: vi.fn(async (_path: string) => undefined),
  };
  const fileSystem = {
    existsSync: vi.fn((_path: string) => true),
  };
  const delayFn = vi.fn(async () => undefined);

  return {
    service: new CollectionService(storage, process, fileSystem as any, delayFn),
    storage,
    process,
    fileSystem,
    delayFn,
    getCollections: () => collections,
  };
}

describe('CollectionService', () => {
  it('lists and gets collections', () => {
    const existing = collection();
    const { service } = createService([existing]);

    expect(service.list()).toEqual([existing]);
    expect(service.get('collection-1')).toEqual(existing);
    expect(service.get('missing')).toBeUndefined();
  });

  it('creates and persists a collection with default name fallback', () => {
    const { service, storage, getCollections } = createService([collection()]);

    const created = service.create('', [app]);

    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Collection 2');
    expect(created.apps).toEqual([app]);
    expect(created.isAutoStart).toBe(false);
    expect(storage.saveCollections).toHaveBeenCalledTimes(1);
    expect(getCollections()).toHaveLength(2);
  });

  it('updates existing collections and returns null for missing ones', () => {
    const { service, getCollections } = createService([collection()]);

    const updated = service.update('collection-1', { name: 'Personal' });

    expect(updated?.name).toBe('Personal');
    expect(getCollections()[0].name).toBe('Personal');
    expect(service.update('missing', { name: 'Nope' })).toBeNull();
  });

  it('deletes existing collections only', () => {
    const { service, getCollections } = createService([collection()]);

    expect(service.delete('missing')).toBe(false);
    expect(getCollections()).toHaveLength(1);
    expect(service.delete('collection-1')).toBe(true);
    expect(getCollections()).toEqual([]);
  });

  it('sets one auto-start collection and clears the others', () => {
    const { service, getCollections } = createService([
      collection({ id: 'collection-1', isAutoStart: true }),
      collection({ id: 'collection-2', isAutoStart: false }),
    ]);

    const result = service.setAutoStart('collection-2');

    expect(result?.id).toBe('collection-2');
    expect(getCollections().map((item) => item.isAutoStart)).toEqual([false, true]);
    expect(service.getAutoStartCollection()?.id).toBe('collection-2');
    expect(service.setAutoStart('missing')).toBeNull();
  });

  it('clears auto-start from all collections', () => {
    const { service, getCollections } = createService([
      collection({ id: 'collection-1', isAutoStart: true }),
      collection({ id: 'collection-2', isAutoStart: true }),
    ]);

    service.clearAutoStart();

    expect(getCollections().every((item) => !item.isAutoStart)).toBe(true);
  });

  it('returns a failed run result when collection is missing', async () => {
    const { service } = createService();

    await expect(service.run('missing')).resolves.toEqual({
      launched: [],
      skipped: [],
      failed: [{ app: 'Unknown', reason: 'Collection not found' }],
    });
  });

  it('runs apps, skipping missing and already-running executables', async () => {
    const missingApp = { ...app, id: 'missing', name: 'Missing', path: 'missing.exe' };
    const runningApp = { ...app, id: 'running', name: 'Running', path: 'running.exe' };
    const launchApp = { ...app, id: 'launch', name: 'Launch', path: 'launch.exe' };
    const { service, fileSystem, process, delayFn } = createService([
      collection({ apps: [missingApp, runningApp, launchApp] }),
    ]);
    fileSystem.existsSync.mockImplementation((path) => path !== 'missing.exe');
    process.isProcessRunning.mockImplementation(async (path) => path === 'running.exe');

    const result = await service.run('collection-1');

    expect(result).toEqual({
      launched: ['Launch'],
      skipped: [{ app: 'Running', reason: 'Already running' }],
      failed: [{ app: 'Missing', reason: 'Executable not found' }],
    });
    expect(process.launchApp).toHaveBeenCalledWith('launch.exe');
    expect(delayFn).toHaveBeenCalledWith(500);
  });

  it('records launch failures', async () => {
    const { service, process } = createService([collection()]);
    process.launchApp.mockRejectedValueOnce(new Error('Access denied'));

    await expect(service.run('collection-1')).resolves.toEqual({
      launched: [],
      skipped: [],
      failed: [{ app: 'Editor', reason: 'Access denied' }],
    });
  });
});
