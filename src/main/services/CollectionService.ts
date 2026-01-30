import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { Collection, App, RunResult } from '../../shared/types';
import { storageService } from './StorageService';
import { processService } from './ProcessService.windows';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CollectionService {
  list(): Collection[] {
    return storageService.getCollections();
  }

  get(id: string): Collection | undefined {
    return this.list().find((c) => c.id === id);
  }

  create(name: string, apps: App[]): Collection {
    const collections = this.list();

    const collection: Collection = {
      id: uuidv4(),
      name: name || `Collection ${collections.length + 1}`,
      apps,
      isAutoStart: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    collections.push(collection);
    storageService.saveCollections(collections);
    return collection;
  }

  update(id: string, updates: Partial<Pick<Collection, 'name' | 'apps'>>): Collection | null {
    const collections = this.list();
    const index = collections.findIndex((c) => c.id === id);

    if (index === -1) return null;

    collections[index] = {
      ...collections[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageService.saveCollections(collections);
    return collections[index];
  }

  delete(id: string): boolean {
    const collections = this.list();
    const filtered = collections.filter((c) => c.id !== id);

    if (filtered.length === collections.length) return false;

    storageService.saveCollections(filtered);
    return true;
  }

  setAutoStart(id: string): Collection | null {
    const collections = this.list();
    const index = collections.findIndex((c) => c.id === id);

    if (index === -1) return null;

    // Unset all others, set this one
    collections.forEach((c, i) => {
      c.isAutoStart = i === index;
      c.updatedAt = new Date().toISOString();
    });

    storageService.saveCollections(collections);
    return collections[index];
  }

  clearAutoStart(): void {
    const collections = this.list();
    collections.forEach((c) => {
      c.isAutoStart = false;
    });
    storageService.saveCollections(collections);
  }

  getAutoStartCollection(): Collection | undefined {
    return this.list().find((c) => c.isAutoStart);
  }

  async run(id: string): Promise<RunResult> {
    const collection = this.get(id);

    if (!collection) {
      return { launched: [], skipped: [], failed: [{ app: 'Unknown', reason: 'Collection not found' }] };
    }

    const result: RunResult = {
      launched: [],
      skipped: [],
      failed: [],
    };

    for (const app of collection.apps) {
      // Check if executable exists
      if (!fs.existsSync(app.path)) {
        result.failed.push({ app: app.name, reason: 'Executable not found' });
        continue;
      }

      // Check if already running
      const isRunning = await processService.isProcessRunning(app.path);
      if (isRunning) {
        result.skipped.push({ app: app.name, reason: 'Already running' });
        continue;
      }

      // Launch
      try {
        await processService.launchApp(app.path);
        result.launched.push(app.name);
        await delay(500); // Prevent system overload
      } catch (error) {
        result.failed.push({
          app: app.name,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }
}

export const collectionService = new CollectionService();
