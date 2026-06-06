import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type AppData, type AppSettings, type Collection } from '../../../shared/types';
import { StorageService } from '../StorageService';

function createStore(initial: Partial<AppData> = {}) {
  const data: Partial<AppData> = { ...initial };

  return {
    get: <K extends keyof AppData>(key: K, defaultValue: AppData[K]) => data[key] ?? defaultValue,
    set: <K extends keyof AppData>(key: K, value: AppData[K]) => {
      data[key] = value;
    },
  };
}

describe('StorageService', () => {
  it('returns default collections when none are stored', () => {
    const service = new StorageService(createStore() as any);

    expect(service.getCollections()).toEqual([]);
  });

  it('saves and returns collections', () => {
    const store = createStore();
    const service = new StorageService(store as any);
    const collections: Collection[] = [
      {
        id: 'collection-1',
        name: 'Work',
        apps: [],
        isAutoStart: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    service.saveCollections(collections);

    expect(service.getCollections()).toEqual(collections);
  });

  it('merges partial stored settings with defaults', () => {
    const partialSettings = {
      autoStartDelay: 3,
      showNotifications: false,
    } as Partial<AppSettings>;
    const service = new StorageService(createStore({ settings: partialSettings as AppSettings }) as any);

    expect(service.getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      autoStartDelay: 3,
      showNotifications: false,
      excludedProcessNames: [],
      excludedPaths: [],
    });
  });

  it('returns collections and settings from getAll', () => {
    const collections: Collection[] = [];
    const service = new StorageService(
      createStore({ collections, settings: { ...DEFAULT_SETTINGS, minimizeToTray: false } }) as any
    );

    expect(service.getAll()).toEqual({
      collections,
      settings: {
        ...DEFAULT_SETTINGS,
        minimizeToTray: false,
        excludedProcessNames: [],
        excludedPaths: [],
      },
    });
  });
});
