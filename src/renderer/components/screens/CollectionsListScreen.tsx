import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { CollectionCard } from '../shared/CollectionCard';
import { RunResult } from '../../../shared/types';

interface CollectionsListScreenProps {
  onEdit: (id: string) => void;
}

export function CollectionsListScreen({ onEdit }: CollectionsListScreenProps) {
  const { collections, loading, deleteCollection, setAutoStart, clearAutoStart, runCollection } =
    useAppContext();
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedIndex >= collections.length && collections.length > 0) {
      setSelectedIndex(collections.length - 1);
    }
  }, [collections.length, selectedIndex]);

  const handleRun = async (id: string) => {
    setRunning(id);
    setRunResult(null);
    try {
      const result = await runCollection(id);
      setRunResult(result);
    } finally {
      setRunning(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this collection?')) await deleteCollection(id);
  };

  const handleToggleAutoStart = async (id: string) => {
    const collection = collections.find((c) => c.id === id);
    if (collection?.isAutoStart) await clearAutoStart();
    else await setAutoStart(id);
  };

  const runSelected = () => collections[selectedIndex] && handleRun(collections[selectedIndex].id);
  const editSelected = () => collections[selectedIndex] && onEdit(collections[selectedIndex].id);
  const deleteSelected = () =>
    collections[selectedIndex] && handleDelete(collections[selectedIndex].id);
  const toggleAutoStartSelected = () =>
    collections[selectedIndex] && handleToggleAutoStart(collections[selectedIndex].id);

  useKeyboardShortcuts(
    [
      { key: 'ArrowUp', action: () => setSelectedIndex((i) => Math.max(0, i - 1)), description: 'Up' },
      {
        key: 'ArrowDown',
        action: () => setSelectedIndex((i) => Math.min(collections.length - 1, i + 1)),
        description: 'Down',
      },
      { key: 'Enter', action: runSelected, description: 'Run' },
      { key: 'e', action: editSelected, description: 'Edit' },
      { key: 'Delete', action: deleteSelected, description: 'Delete' },
      { key: 'a', action: toggleAutoStartSelected, description: 'Auto-start' },
    ],
    !loading && collections.length > 0
  );

  if (loading) {
    return <div className="p-4 text-center text-slate">Loading collections...</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-hairline bg-canvas px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-brand-green-soft px-3 py-1 text-xs font-semibold text-brand-green-dark">
              Saved workspaces
            </div>
            <h1 className="text-3xl font-medium leading-tight tracking-[-0.5px] text-ink">Collections</h1>
            <p className="mt-2 text-sm leading-6 text-slate">Launch saved app groups with one click.</p>
          </div>
          <div className="rounded-full bg-surface-feature px-3 py-1 text-sm font-semibold text-brand-green-dark">
            {collections.length} total
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4" ref={listRef}>
        {collections.length === 0 ? (
          <div className="mx-auto mt-8 max-w-md rounded-xl border border-hairline bg-canvas p-6 text-center shadow-[rgba(0,30,43,0.04)_0px_1px_2px_0px]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green-soft text-xl">
              ↗
            </div>
            <h2 className="text-lg font-semibold text-ink">No collections yet</h2>
            <p className="mt-2 text-sm leading-6 text-slate">
              Go to Capture to save your current workspace as a launchable collection.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {collections.map((collection, index) => (
              <div
                key={collection.id}
                className={`rounded-xl transition-all ${
                  index === selectedIndex ? 'ring-2 ring-brand-green ring-offset-2 ring-offset-surface-soft' : ''
                }`}
                onClick={() => setSelectedIndex(index)}
              >
                <CollectionCard
                  collection={collection}
                  onRun={handleRun}
                  onEdit={onEdit}
                  onDelete={handleDelete}
                  onToggleAutoStart={handleToggleAutoStart}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {runResult && (
        <div className="border-t border-hairline bg-canvas p-3 text-sm">
          <div className="flex justify-between gap-3">
            <div className="space-y-1">
              {runResult.launched.length > 0 && (
                <p className="font-medium text-brand-green-dark">Launched: {runResult.launched.join(', ')}</p>
              )}
              {runResult.skipped.length > 0 && (
                <p className="text-amber-700">Skipped: {runResult.skipped.map((s) => s.app).join(', ')}</p>
              )}
              {runResult.failed.length > 0 && (
                <p className="text-red-700">Failed: {runResult.failed.map((f) => f.app).join(', ')}</p>
              )}
            </div>
            <button onClick={() => setRunResult(null)} className="rounded-full px-2 text-steel active:bg-surface">
              ×
            </button>
          </div>
        </div>
      )}

      {running && (
        <div className="border-t border-hairline bg-brand-green-soft p-3 text-sm font-semibold text-brand-green-dark">
          Launching collection...
        </div>
      )}
    </div>
  );
}
