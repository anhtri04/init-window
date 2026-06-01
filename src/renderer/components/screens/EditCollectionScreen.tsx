import React, { useState, useEffect } from 'react';
import { App } from '../../../shared/types';
import { useAppContext } from '../../context/AppContext';
import { useProcessScanner } from '../../hooks/useProcessScanner';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ShortcutBar } from '../shared/ShortcutBar';
import { Button } from '../shared/Button';
import { AppListItem } from '../shared/AppListItem';
import { SkeletonAppListItem } from '../shared/SkeletonAppListItem';

interface EditCollectionScreenProps {
  collectionId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function EditCollectionScreen({ collectionId, onSave, onCancel }: EditCollectionScreenProps) {
  const { collections, updateCollection } = useAppContext();
  const { apps: scannedApps, scanning, scan, clear } = useProcessScanner();

  const [name, setName] = useState('');
  const [apps, setApps] = useState<App[]>([]);
  const [showAddApps, setShowAddApps] = useState(false);
  const [selectedNewApps, setSelectedNewApps] = useState<Set<string>>(new Set());
  const [selectedAppIndex, setSelectedAppIndex] = useState(0);

  useEffect(() => {
    const collection = collections.find((c) => c.id === collectionId);
    if (collection) {
      setName(collection.name);
      setApps([...collection.apps]);
    }
  }, [collectionId, collections]);

  useEffect(() => {
    if (selectedAppIndex >= apps.length && apps.length > 0) {
      setSelectedAppIndex(apps.length - 1);
    }
  }, [apps.length, selectedAppIndex]);

  const handleRemoveApp = (app: App) => setApps((prev) => prev.filter((a) => a.id !== app.id));

  const handleToggleNewApp = (app: App) => {
    setSelectedNewApps((prev) => {
      const next = new Set(prev);
      if (next.has(app.id)) next.delete(app.id);
      else next.add(app.id);
      return next;
    });
  };

  const handleAddSelectedApps = () => {
    const existingPaths = new Set(apps.map((a) => a.path));
    const newApps = scannedApps.filter((a) => selectedNewApps.has(a.id) && !existingPaths.has(a.path));
    setApps((prev) => [...prev, ...newApps]);
    setShowAddApps(false);
    setSelectedNewApps(new Set());
    clear();
  };

  const handleSave = async () => {
    await updateCollection(collectionId, { name: name.trim(), apps });
    onSave();
  };

  const handleStartAddApps = async () => {
    setShowAddApps(true);
    await scan();
  };

  const removeSelectedApp = () => apps[selectedAppIndex] && handleRemoveApp(apps[selectedAppIndex]);

  useKeyboardShortcuts(
    [
      { key: 's', ctrl: true, action: handleSave, description: 'Save' },
      { key: 'Escape', action: onCancel, description: 'Cancel' },
      { key: 'ArrowUp', action: () => setSelectedAppIndex((i) => Math.max(0, i - 1)), description: 'Up' },
      {
        key: 'ArrowDown',
        action: () => setSelectedAppIndex((i) => Math.min(apps.length - 1, i + 1)),
        description: 'Down',
      },
      { key: 'Delete', action: removeSelectedApp, description: 'Remove' },
    ],
    !showAddApps
  );

  useKeyboardShortcuts(
    [
      { key: 'Escape', action: () => setShowAddApps(false), description: 'Cancel' },
      { key: 'Enter', action: handleAddSelectedApps, description: 'Add' },
      { key: 'ArrowUp', action: () => setSelectedAppIndex((i) => Math.max(0, i - 1)), description: 'Up' },
      {
        key: 'ArrowDown',
        action: () => setSelectedAppIndex((i) => Math.min(apps.length - 1, i + 1)),
        description: 'Down',
      },
    ],
    showAddApps
  );

  const availableApps = scannedApps.filter((a) => !apps.some((existing) => existing.path === a.path));

  if (showAddApps) {
    return (
      <div className="flex h-full flex-col bg-surface-soft">
        <div className="border-b border-hairline bg-brand-teal-deep px-5 py-5 text-on-dark">
          <div className="mb-2 inline-flex rounded-full bg-brand-green-soft px-3 py-1 text-xs font-semibold text-brand-green-dark">
            Add apps
          </div>
          <h1 className="text-2xl font-medium tracking-[-0.5px]">Choose running apps</h1>
          <p className="mt-2 text-sm text-on-dark-muted">Add new apps to this collection.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {scanning && availableApps.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, index) => (
                <SkeletonAppListItem key={index} />
              ))}
            </div>
          ) : availableApps.length === 0 ? (
            <div className="mx-auto mt-8 max-w-md rounded-xl border border-hairline bg-canvas p-6 text-center">
              <h2 className="text-lg font-semibold text-ink">No new apps to add</h2>
              <p className="mt-2 text-sm text-slate">All scanned apps are already in this collection.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableApps.map((app) => (
                <AppListItem
                  key={app.id}
                  app={app}
                  selected={selectedNewApps.has(app.id)}
                  onToggle={handleToggleNewApp}
                  showCheckbox
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-hairline bg-canvas p-4">
          <Button variant="secondary" onClick={() => setShowAddApps(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleAddSelectedApps} disabled={selectedNewApps.size === 0} className="flex-1">
            Add ({selectedNewApps.size})
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-surface-soft">
      <div className="border-b border-hairline bg-canvas p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex rounded-full bg-brand-green-soft px-3 py-1 text-xs font-semibold text-brand-green-dark">
              Edit collection
            </div>
            <p className="text-sm text-slate">Update the name or app list for this workspace.</p>
          </div>
          <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-slate">
            {apps.length} apps
          </span>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Collection name"
          className="h-11 w-full rounded-lg border border-hairline-strong bg-canvas px-3 text-ink placeholder:text-steel focus:border-brand-green-dark focus:outline-hidden focus:ring-2 focus:ring-brand-green/30"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {apps.length === 0 ? (
          <div className="mx-auto mt-8 max-w-md rounded-xl border border-hairline bg-canvas p-6 text-center">
            <h2 className="text-lg font-semibold text-ink">No apps in this collection</h2>
            <p className="mt-2 text-sm text-slate">Add apps to make this workspace launchable.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {apps.map((app, index) => (
              <div
                key={app.id}
                className={`rounded-lg transition-all ${
                  index === selectedAppIndex ? 'ring-2 ring-brand-green ring-offset-2 ring-offset-surface-soft' : ''
                }`}
                onClick={() => setSelectedAppIndex(index)}
              >
                <AppListItem app={app} onRemove={handleRemoveApp} showRemove />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-hairline bg-canvas p-4">
        <Button variant="secondary" onClick={handleStartAddApps} className="w-full">
          + Add Apps
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save
          </Button>
        </div>
      </div>

      <ShortcutBar
        shortcuts={[
          { key: '↑↓', label: 'Navigate' },
          { key: 'Del', label: 'Remove' },
          { key: 'Ctrl+S', label: 'Save' },
          { key: 'Esc', label: 'Cancel' },
        ]}
      />
    </div>
  );
}
