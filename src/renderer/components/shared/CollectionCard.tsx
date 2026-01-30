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

      <div className="flex items-center gap-2 mb-3">
        <p className="text-sm text-gray-500">
          {collection.apps.length} app{collection.apps.length !== 1 ? 's' : ''}
        </p>
        {collection.apps.length > 0 && (
          <div className="flex -space-x-1">
            {collection.apps.slice(0, 4).map((app, index) => (
              <div
                key={app.id}
                className="w-5 h-5 rounded border border-white bg-gray-100 flex items-center justify-center overflow-hidden"
                style={{ zIndex: collection.apps.length - index }}
                title={app.name}
              >
                {app.icon ? (
                  <img
                    src={`file://${app.icon}`}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-[8px] font-medium text-gray-600">
                    {app.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
            {collection.apps.length > 4 && (
              <div className="w-5 h-5 rounded border border-white bg-gray-200 flex items-center justify-center text-[8px] text-gray-600">
                +{collection.apps.length - 4}
              </div>
            )}
          </div>
        )}
      </div>

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
