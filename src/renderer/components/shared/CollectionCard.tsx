import React from 'react';
import { Collection } from '../../../shared/types';

interface CollectionCardProps {
  collection: Collection;
  onRun: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleAutoStart: (id: string) => void;
}

export function CollectionCard({
  collection,
  onRun,
  onEdit,
  onDelete,
  onToggleAutoStart,
}: CollectionCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium truncate flex-1">{collection.name}</h3>
        <button
          onClick={() => onToggleAutoStart(collection.id)}
          className={`text-xl ${collection.isAutoStart ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500`}
          title={collection.isAutoStart ? 'Auto-start enabled' : 'Click to auto-start'}
        >
          ★
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-3">
        {collection.apps.length} app{collection.apps.length !== 1 ? 's' : ''}
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => onRun(collection.id)}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded text-sm"
        >
          ▶ Run
        </button>
        <button
          onClick={() => onEdit(collection.id)}
          className="bg-gray-200 hover:bg-gray-300 py-1 px-3 rounded text-sm"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(collection.id)}
          className="bg-red-100 hover:bg-red-200 text-red-600 py-1 px-3 rounded text-sm"
        >
          ×
        </button>
      </div>
    </div>
  );
}
