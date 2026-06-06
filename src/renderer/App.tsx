import { useCallback, useState } from 'react';
import type { Collection } from '../shared/types';
import { AppProvider } from './context/AppContext';
import { useCollectionDashboard } from './hooks/useCollectionDashboard';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { CollectionDetailPanel } from './components/collections/CollectionDetailPanel';
import { CollectionSidebar } from './components/collections/CollectionSidebar';
import { CaptureCollectionModal } from './components/capture/CaptureCollectionModal';
import { EditCollectionScreen } from './components/screens/EditCollectionScreen';

function AppContent() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);

  const {
    collections,
    loading,
    selectedId,
    setSelectedId,
    selectedCollection,
    metric,
    metricsLoading,
    metricsError,
    running,
    runResult,
    handleRun,
    handleStartApp,
    handleStopApp,
    handleDelete,
    handleToggleAutoStart,
    refreshMetrics,
    selectByOffset,
    setRunResult,
  } = useCollectionDashboard();

  const handleEdit = useCallback((id: string) => {
    setSelectedId(id);
    setEditingId(id);
  }, [setSelectedId]);

  const handleEditComplete = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleSelectCollection = useCallback((id: string) => {
    setSelectedId(id);
    setEditingId(null);
  }, [setSelectedId]);

  const handleOpenCapture = useCallback(() => {
    setEditingId(null);
    setCaptureOpen(true);
  }, []);

  const handleCaptureComplete = useCallback((collection: Collection) => {
    setCaptureOpen(false);
    setEditingId(null);
    setSelectedId(collection.id);
  }, [setSelectedId]);

  useKeyboardShortcuts(
    [
      {
        key: 'n',
        ctrl: true,
        action: handleOpenCapture,
        description: 'Capture new collection',
      },
    ],
    !captureOpen
  );

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
        action: () => selectedCollection && handleEdit(selectedCollection.id),
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
    !loading && collections.length > 0 && !editingId && !captureOpen
  );

  if (loading) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center bg-surface-soft text-slate">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden bg-surface-soft text-ink">
      <CollectionSidebar
        collections={collections}
        selectedId={selectedId ?? undefined}
        selectedMetric={metric}
        onSelect={handleSelectCollection}
        onCapture={handleOpenCapture}
      />

      <div className="min-w-0 flex-1 overflow-hidden">
        {editingId ? (
          <EditCollectionScreen
            collectionId={editingId}
            onSave={handleEditComplete}
            onCancel={handleEditComplete}
          />
        ) : (
          <CollectionDetailPanel
            collection={selectedCollection}
            metric={metric}
            metricsLoading={metricsLoading}
            metricsError={metricsError}
            running={running}
            runResult={runResult}
            onRun={() => selectedCollection && handleRun(selectedCollection.id)}
            onEdit={() => selectedCollection && handleEdit(selectedCollection.id)}
            onDelete={() => selectedCollection && handleDelete(selectedCollection.id)}
            onToggleAutoStart={() =>
              selectedCollection && handleToggleAutoStart(selectedCollection.id)
            }
            onRefresh={() => refreshMetrics(true)}
            onStartApp={handleStartApp}
            onStopApp={handleStopApp}
            onDismissRunResult={() => setRunResult(null)}
          />
        )}
      </div>

      <CaptureCollectionModal
        open={captureOpen}
        onComplete={handleCaptureComplete}
        onClose={() => setCaptureOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
