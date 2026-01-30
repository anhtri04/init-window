import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
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
    if (confirm('Delete this collection?')) {
      await deleteCollection(id);
    }
  };

  const handleToggleAutoStart = async (id: string) => {
    const collection = collections.find((c) => c.id === id);
    if (collection?.isAutoStart) {
      await clearAutoStart();
    } else {
      await setAutoStart(id);
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {collections.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No collections yet.</p>
            <p className="text-sm mt-2">Go to Capture tab to create one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                onRun={handleRun}
                onEdit={onEdit}
                onDelete={handleDelete}
                onToggleAutoStart={handleToggleAutoStart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Run result notification */}
      {runResult && (
        <div className="border-t bg-white p-3 text-sm">
          <div className="flex justify-between items-start">
            <div>
              {runResult.launched.length > 0 && (
                <p className="text-green-600">✓ Launched: {runResult.launched.join(', ')}</p>
              )}
              {runResult.skipped.length > 0 && (
                <p className="text-yellow-600">
                  ⚠ Skipped: {runResult.skipped.map((s) => s.app).join(', ')}
                </p>
              )}
              {runResult.failed.length > 0 && (
                <p className="text-red-600">
                  ✗ Failed: {runResult.failed.map((f) => f.app).join(', ')}
                </p>
              )}
            </div>
            <button
              onClick={() => setRunResult(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Running indicator */}
      {running && (
        <div className="border-t bg-blue-50 p-3 text-sm text-blue-600">
          Launching collection...
        </div>
      )}
    </div>
  );
}
