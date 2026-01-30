import Store from 'electron-store';
import { AppData, Collection, AppSettings, DEFAULT_SETTINGS } from '../../shared/types';

const schema = {
  collections: {
    type: 'array' as const,
    default: [],
  },
  settings: {
    type: 'object' as const,
    default: DEFAULT_SETTINGS,
  },
};

class StorageService {
  private store: Store<AppData>;

  constructor() {
    this.store = new Store<AppData>({
      name: 'data',
      schema,
    });
  }

  getCollections(): Collection[] {
    return this.store.get('collections', []);
  }

  saveCollections(collections: Collection[]): void {
    this.store.set('collections', collections);
  }

  getSettings(): AppSettings {
    return this.store.get('settings', DEFAULT_SETTINGS);
  }

  saveSettings(settings: AppSettings): void {
    this.store.set('settings', settings);
  }

  getAll(): AppData {
    return {
      collections: this.getCollections(),
      settings: this.getSettings(),
    };
  }
}

export const storageService = new StorageService();
