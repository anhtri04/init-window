import { CollectionMetric } from '../../shared/types';
import { MetricsService } from './MetricsService.interface';
import { collectionService } from './CollectionService';

class DarwinMetricsService implements MetricsService {
  async getCollectionMetrics(collectionId: string): Promise<CollectionMetric | null> {
    const collection = collectionService.get(collectionId);

    if (!collection) {
      return null;
    }

    return {
      collectionId,
      totalApps: collection.apps.length,
      runningApps: 0,
      totalCpuPercent: 0,
      totalMemoryMB: 0,
      longestUptimeSeconds: 0,
      apps: collection.apps.map((app) => ({
        appId: app.id,
        name: app.name,
        path: app.path,
        icon: app.icon,
        isRunning: false,
        processCount: 0,
        cpuPercent: 0,
        memoryMB: 0,
        pidList: [],
      })),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const metricsService = new DarwinMetricsService();
