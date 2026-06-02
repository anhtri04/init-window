import React from 'react';
import { Collection, CollectionMetric } from '../../../shared/types';

interface CollectionSidebarProps {
  collections: Collection[];
  selectedId?: string;
  selectedMetric: CollectionMetric | null;
  onSelect: (id: string) => void;
}

function formatMemory(memoryMB?: number): string {
  if (!memoryMB) return '0 MB';
  return memoryMB >= 1024 ? `${(memoryMB / 1024).toFixed(1)} GB` : `${Math.round(memoryMB)} MB`;
}

export function CollectionSidebar({
  collections,
  selectedId,
  selectedMetric,
  onSelect,
}: CollectionSidebarProps) {
  return (
    <aside className="flex h-full w-[20%] min-w-[260px] flex-col border-r border-hairline bg-canvas">
      <div className="bg-brand-teal-deep border-b border-hairline px-4 py-4 text-on-dark">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-steel">Collections</p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.3px]">Workspace list</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {collections.length === 0 ? (
          <div className="rounded-xl border border-hairline bg-surface-soft p-4 text-sm text-slate">
            No collections yet. Go to Capture to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {collections.map((collection) => {
              const isSelected = collection.id === selectedId;
              const metric = isSelected ? selectedMetric : null;
              const runningApps = metric?.runningApps ?? 0;
              const totalCpu = metric ? `${metric.totalCpuPercent.toFixed(1)}%` : '--';
              const totalMemory = metric ? formatMemory(metric.totalMemoryMB) : '--';

              return (
                <button
                  key={collection.id}
                  onClick={() => onSelect(collection.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors focus:outline-hidden focus:ring-2 focus:ring-brand-green/30 ${
                    isSelected
                      ? 'border-brand-green bg-surface-feature'
                      : 'border-hairline bg-canvas hover:bg-surface-soft'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-ink">{collection.name}</h3>
                      <p className="mt-1 text-sm text-slate">
                        {collection.apps.length} app{collection.apps.length !== 1 ? 's' : ''}
                        {metric ? ` · ${runningApps} running` : ''}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        collection.isAutoStart
                          ? 'bg-brand-green-soft text-brand-green-dark'
                          : 'bg-surface text-steel'
                      }`}
                    >
                      {collection.isAutoStart ? '★' : '☆'}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate">
                    <span className="rounded-full bg-surface px-2.5 py-1">CPU {totalCpu}</span>
                    <span className="rounded-full bg-surface px-2.5 py-1">RAM {totalMemory}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
