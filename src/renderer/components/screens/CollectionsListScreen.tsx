import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { CollectionDetailPanel } from '../collections/CollectionDetailPanel';
import { CollectionSidebar } from '../collections/CollectionSidebar';
import { CollectionMetric, RunResult } from '../../../shared/types';

interface CollectionsListScreenProps {
  onEdit: (id: string) => void;
}

const METRICS_POLL_INTERVAL_MS = 5000;

export function CollectionsListScreen({ onEdit }: CollectionsListScreenProps) {
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

  const handleRun = async (id: string) => {
    setRunningId(id);
    setRunResult(null);
    try {
      const result = await runCollection(id);
      setRunResult(result);
      await refreshMetrics(true);
    } finally {
      setRunningId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this collection?')) {
      await deleteCollection(id);
    }
  };

  const handleToggleAutoStart = async (id: string) => {
    const collection = collections.find((item) => item.id === id);
    if (collection?.isAutoStart) {
      await clearAutoStart();
    } else {
      await setAutoStart(id);
    }
  };

  const selectByOffset = (offset: number) => {
    if (collections.length === 0) {
      return;
    }

    const currentIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = Math.min(collections.length - 1, Math.max(0, currentIndex + offset));
    setSelectedId(collections[nextIndex].id);
  };

  useKeyboardShortcuts(
    [
      {
        key: 'ArrowUp',
        action: () => selectByOffset(-1),
        description: 'Up',
      },
      {
        key: 'ArrowDown',
        action: () => selectByOffset(1),
        description: 'Down',
      },
      {
        key: 'Enter',
        action: () => selectedCollection && handleRun(selectedCollection.id),
        description: 'Run',
      },
      {
        key: 'e',
        action: () => selectedCollection && onEdit(selectedCollection.id),
        description: 'Edit',
      },
      {
        key: 'Delete',
        action: () => selectedCollection && handleDelete(selectedCollection.id),
        description: 'Delete',
      },
      {
        key: 'a',
        action: () => selectedCollection && handleToggleAutoStart(selectedCollection.id),
        description: 'Auto-start',
      },
      {
        key: 'r',
        action: () => refreshMetrics(true),
        description: 'Refresh metrics',
      },
    ],
    !loading && collections.length > 0
  );

  if (loading) {
    return <div className="p-4 text-center text-slate">Loading...</div>;
  }

  return (
    <div className="flex h-full bg-surface-soft">
      <CollectionSidebar
        collections={collections}
        selectedId={selectedId ?? undefined}
        selectedMetric={metric}
        onSelect={setSelectedId}
      />

      <CollectionDetailPanel
        collection={selectedCollection}
        metric={metric}
        metricsLoading={metricsLoading}
        metricsError={metricsError}
        running={runningId === selectedCollection?.id}
        runResult={runResult}
        onRun={() => selectedCollection && handleRun(selectedCollection.id)}
        onEdit={() => selectedCollection && onEdit(selectedCollection.id)}
        onDelete={() => selectedCollection && handleDelete(selectedCollection.id)}
        onToggleAutoStart={() => selectedCollection && handleToggleAutoStart(selectedCollection.id)}
        onRefresh={() => refreshMetrics(true)}
        onDismissRunResult={() => setRunResult(null)}
      />
    </div>
  );
}
