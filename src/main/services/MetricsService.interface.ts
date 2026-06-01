import { CollectionMetric } from '../../shared/types';

export interface MetricsService {
  getCollectionMetrics(collectionId: string): Promise<CollectionMetric | null>;
}
