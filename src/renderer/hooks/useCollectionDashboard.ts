import { useCallback, useEffect, useState } from 'react';
import type { AppMetric, CollectionMetric, RunResult } from '../../shared/types';
import { useAppContext } from '../context/AppContext';

const METRICS_POLL_INTERVAL_MS = 5000;

export function useCollectionDashboard() {
  const { collections, loading, deleteCollection, setAutoStart, clearAutoStart, runCollection } =
    useAppContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [metric, setMetric] = useState<CollectionMetric | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const selectedCollection = collections.find((collection) => collection.id === selectedId);
  const selectedIndex = selectedCollection
    ? collections.findIndex((collection) => collection.id === selectedCollection.id)
    : -1;

  useEffect(() => {
    if (collections.length === 0) {
      setSelectedId(null);
      setMetric(null);
      return;
    }

    if (!selectedId || !collections.some((collection) => collection.id === selectedId)) {
      setSelectedId(collections[0].id);
    }
  }, [collections, selectedId]);

  const refreshMetrics = useCallback(async (showLoading = true) => {
    if (!selectedId) {
      setMetric(null);
      return;
    }

    if (showLoading) {
      setMetricsLoading(true);
    }
    setMetricsError(null);

    try {
      const data = await window.electron.getCollectionMetrics(selectedId);
      setMetric(data);
    } catch (error) {
      console.error('Failed to load collection metrics:', error);
      setMetricsError('Could not load metrics from the operating system.');
    } finally {
      if (showLoading) {
        setMetricsLoading(false);
      }
    }
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    setMetric(null);
    refreshMetrics(true);

    const timer = window.setInterval(() => {
      refreshMetrics(false);
    }, METRICS_POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [selectedId, refreshMetrics]);

  const handleRun = useCallback(async (id: string) => {
    setRunningId(id);
    setRunResult(null);
    try {
      const result = await runCollection(id);
      setRunResult(result);
      await refreshMetrics(true);
    } finally {
      setRunningId(null);
    }
  }, [refreshMetrics, runCollection]);

  const handleStartApp = useCallback(async (app: AppMetric) => {
    await window.electron.launchApp(app.path);
    await refreshMetrics(true);
  }, [refreshMetrics]);

  const handleStopApp = useCallback(async (app: AppMetric) => {
    await window.electron.shutDownApp(app.path);
    await refreshMetrics(true);
  }, [refreshMetrics]);

  const handleDelete = useCallback(async (id: string) => {
    if (confirm('Delete this collection?')) {
      await deleteCollection(id);
    }
  }, [deleteCollection]);

  const handleToggleAutoStart = useCallback(async (id: string) => {
    const collection = collections.find((item) => item.id === id);
    if (collection?.isAutoStart) {
      await clearAutoStart();
    } else {
      await setAutoStart(id);
    }
  }, [clearAutoStart, collections, setAutoStart]);

  const selectByOffset = useCallback((offset: number) => {
    if (collections.length === 0) {
      return;
    }

    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = Math.min(collections.length - 1, Math.max(0, currentIndex + offset));
    setSelectedId(collections[nextIndex].id);
  }, [collections, selectedIndex]);

  return {
    collections,
    loading,
    selectedId,
    setSelectedId,
    selectedCollection,
    metric,
    metricsLoading,
    metricsError,
    runningId,
    running: runningId === selectedCollection?.id,
    runResult,
    handleRun,
    handleStartApp,
    handleStopApp,
    handleDelete,
    handleToggleAutoStart,
    refreshMetrics,
    selectByOffset,
    setRunResult,
  };
}
