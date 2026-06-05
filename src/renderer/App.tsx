import React, { useCallback, useState } from 'react';
import type { Collection } from '../shared/types';
import { AppProvider } from './context/AppContext';
import { useCollectionDashboard } from './hooks/useCollectionDashboard';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { CollectionDetailPanel } from './components/collections/CollectionDetailPanel';
import { CollectionSidebar } from './components/collections/CollectionSidebar';
import { CaptureAndBuildScreen } from './components/screens/CaptureAndBuildScreen';
import { EditCollectionScreen } from './components/screens/EditCollectionScreen';

interface CaptureModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

function CaptureModal({ children, onClose }: CaptureModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex bg-brand-teal-deep/60 p-4 backdrop-blur-[1px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Capture running apps"
      onMouseDown={onClose}
    >
      <div
        className="relative flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-xl border border-hairline bg-surface-soft shadow-[rgba(0,30,43,0.24)_0px_24px_60px_0px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-hairline-dark bg-canvas/10 text-lg font-semibold text-on-dark transition-colors hover:bg-canvas/20 focus:outline-hidden focus:ring-2 focus:ring-brand-green/35"
          aria-label="Close capture"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

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

      {captureOpen && (
        <CaptureModal onClose={() => setCaptureOpen(false)}>
          <CaptureAndBuildScreen
            onBuildComplete={handleCaptureComplete}
            onCancel={() => setCaptureOpen(false)}
          />
        </CaptureModal>
      )}
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
