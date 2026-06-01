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
    <div className="rounded-xl border border-hairline bg-canvas p-4 shadow-[rgba(0,30,43,0.04)_0px_1px_2px_0px]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-ink">{collection.name}</h3>
          <p className="mt-1 text-sm text-slate">
            {collection.apps.length} app{collection.apps.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => onToggleAutoStart(collection.id)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            collection.isAutoStart
              ? 'bg-brand-green-soft text-brand-green-dark'
              : 'border border-hairline text-steel'
          }`}
          title={collection.isAutoStart ? 'Auto-start enabled' : 'Click to auto-start'}
        >
          {collection.isAutoStart ? 'Auto-start' : 'Set auto'}
        </button>
      </div>

      {collection.apps.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <div className="flex -space-x-1.5">
            {collection.apps.slice(0, 5).map((app, index) => (
              <div
                key={app.id}
                className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border-2 border-canvas bg-surface"
                style={{ zIndex: collection.apps.length - index }}
                title={app.name}
              >
                {app.icon ? (
                  <img src={`file://${app.icon}`} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[10px] font-semibold text-brand-green-dark">
                    {app.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
            {collection.apps.length > 5 && (
              <div className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-canvas bg-brand-green-soft text-[10px] font-semibold text-brand-green-dark">
                +{collection.apps.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onRun(collection.id)}
          className="flex-1 rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-ink active:bg-brand-green-dark active:text-on-dark"
        >
          ▶ Run
        </button>
        <button
          onClick={() => onEdit(collection.id)}
          className="rounded-full border border-hairline-strong bg-canvas px-4 py-2 text-sm font-semibold text-ink active:bg-surface"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(collection.id)}
          className="rounded-full border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 active:bg-red-100"
          title="Delete collection"
        >
          ×
        </button>
      </div>
    </div>
  );
}
