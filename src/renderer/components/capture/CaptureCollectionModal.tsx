import React, { useState } from 'react';
import type { App, Collection } from '../../../shared/types';
import { useProcessScanner } from '../../hooks/useProcessScanner';
import { useAppContext } from '../../context/AppContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { Button } from '../shared/Button';
import { AppListItem } from '../shared/AppListItem';
import { SkeletonAppListItem } from '../shared/SkeletonAppListItem';
import { isUserApp } from './captureFilters';

interface CaptureCollectionModalProps {
  open: boolean;
  onComplete: (collection: Collection) => void;
  onClose: () => void;
}

export function CaptureCollectionModal({ open, onComplete, onClose }: CaptureCollectionModalProps) {
  const { apps, scanning, scan, clear } = useProcessScanner();
  const { collections, createCollection } = useAppContext();
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [collectionName, setCollectionName] = useState('');
  const [filterUserApps, setFilterUserApps] = useState(false);

  const handleToggle = (app: App) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(app.id)) next.delete(app.id);
      else next.add(app.id);
      return next;
    });
  };

  const displayedApps = filterUserApps ? apps.filter(isUserApp) : apps;

  const handleSelectAll = () => {
    if (selectedApps.size === displayedApps.length) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(displayedApps.map((a) => a.id)));
    }
  };

  const handleBuild = async () => {
    const selected = displayedApps.filter((a) => selectedApps.has(a.id));
    if (selected.length === 0) return;

    const name = collectionName.trim() || `Collection ${collections.length + 1}`;
    const collection = await createCollection(name, selected);

    setSelectedApps(new Set());
    setCollectionName('');
    setFilterUserApps(false);
    clear();
    onComplete(collection);
  };

  useKeyboardShortcuts(
    [
      { key: ' ', action: () => !scanning && scan(), description: 'Scan' },
      { key: 'a', ctrl: true, action: handleSelectAll, description: 'Select all' },
      {
        key: 'Escape',
        action: () => {
          if (selectedApps.size > 0) {
            setSelectedApps(new Set());
            return;
          }
          onClose();
        },
        description: 'Deselect or close',
      },
      { key: 'Enter', action: handleBuild, description: 'Build' },
    ],
    open
  );

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex bg-brand-teal-deep/60 p-4 backdrop-blur-[1px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Capture running apps"
      onMouseDown={onClose}
    >
      <div
        className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-xl border border-hairline bg-surface-soft shadow-[rgba(0,30,43,0.24)_0px_24px_60px_0px]"
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

        <div className="bg-brand-teal-deep px-5 pb-5 pt-5 text-on-dark">
          <div className="mb-3 inline-flex rounded-full bg-brand-green-soft px-3 py-1 text-xs font-semibold text-brand-green-dark">
            Workspace capture
          </div>
          <h1 className="text-2xl font-medium leading-tight tracking-[-0.5px]">Capture running apps</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-on-dark-muted">
            Scan your current desktop, select the apps that belong together, and save them as a
            launchable collection.
          </p>
        </div>

      <div className="flex-1 overflow-y-auto p-4">
        {scanning && apps.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <SkeletonAppListItem key={index} />
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="mx-auto mt-8 max-w-md rounded-xl border border-hairline bg-canvas p-6 text-center shadow-[rgba(0,30,43,0.04)_0px_1px_2px_0px]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green-soft text-xl">
              ◇
            </div>
            <h2 className="text-lg font-semibold text-ink">Ready to build a workspace</h2>
            <p className="mt-2 text-sm leading-6 text-slate">
              Capture running applications, then choose which ones should launch together.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 rounded-xl border border-hairline bg-canvas p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-brand-green-soft px-3 py-1 text-sm font-semibold text-brand-green-dark">
                    {displayedApps.length} apps
                    {displayedApps.length !== apps.length && ` of ${apps.length}`}
                  </span>
                  <button
                    onClick={() => setFilterUserApps(!filterUserApps)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      filterUserApps
                        ? 'bg-brand-teal-deep text-on-dark'
                        : 'border border-hairline text-slate'
                    }`}
                  >
                    {filterUserApps ? 'User apps only' : 'Filter'}
                  </button>
                </div>
                <button onClick={handleSelectAll} className="text-sm font-semibold text-brand-green-dark">
                  {selectedApps.size === displayedApps.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {displayedApps.map((app) => (
                <AppListItem
                  key={app.id}
                  app={app}
                  selected={selectedApps.has(app.id)}
                  onToggle={handleToggle}
                  showCheckbox
                />
              ))}
            </div>
          </>
        )}
      </div>

        <div className="space-y-3 border-t border-hairline bg-canvas p-4">
        {apps.length > 0 && (
          <input
            type="text"
            placeholder={`Collection ${collections.length + 1}`}
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            className="h-11 w-full rounded-lg border border-hairline-strong bg-canvas px-3 text-ink placeholder:text-steel focus:border-brand-green-dark focus:outline-hidden focus:ring-2 focus:ring-brand-green/30"
          />
        )}

        <div className="flex gap-2">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>

          <Button onClick={scan} disabled={scanning} variant="secondary" className="flex-1">
            {scanning ? 'Scanning...' : apps.length > 0 ? 'Rescan' : 'Capture Running Apps'}
          </Button>

          {apps.length > 0 && (
            <Button onClick={handleBuild} disabled={selectedApps.size === 0} className="flex-1">
              Build ({selectedApps.size})
            </Button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
