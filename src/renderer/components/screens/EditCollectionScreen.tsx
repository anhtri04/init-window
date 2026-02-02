import React, { useState, useEffect } from 'react';
import { App, Collection } from '../../../shared/types';
import { useAppContext } from '../../context/AppContext';
import { useProcessScanner } from '../../hooks/useProcessScanner';
import { Button } from '../shared/Button';
import { AppListItem } from '../shared/AppListItem';
import { SkeletonAppListItem } from '../shared/SkeletonAppListItem';

interface EditCollectionScreenProps {
  collectionId: string;
  onSave: () => void;
  onCancel: () => void;
}

export function EditCollectionScreen({
  collectionId,
  onSave,
  onCancel,
}: EditCollectionScreenProps) {
  const { collections, updateCollection } = useAppContext();
  const { apps: scannedApps, scanning, scan, clear } = useProcessScanner();

  const [name, setName] = useState('');
  const [apps, setApps] = useState<App[]>([]);
  const [showAddApps, setShowAddApps] = useState(false);
  const [selectedNewApps, setSelectedNewApps] = useState<Set<string>>(new Set());

  useEffect(() => {
    const collection = collections.find((c) => c.id === collectionId);
    if (collection) {
      setName(collection.name);
      setApps([...collection.apps]);
    }
  }, [collectionId, collections]);

  const handleRemoveApp = (app: App) => {
    setApps((prev) => prev.filter((a) => a.id !== app.id));
  };

  const handleToggleNewApp = (app: App) => {
    setSelectedNewApps((prev) => {
      const next = new Set(prev);
      if (next.has(app.id)) {
        next.delete(app.id);
      } else {
        next.add(app.id);
      }
      return next;
    });
  };

  const handleAddSelectedApps = () => {
    const existingPaths = new Set(apps.map((a) => a.path));
    const newApps = scannedApps.filter(
      (a) => selectedNewApps.has(a.id) && !existingPaths.has(a.path)
    );
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

  // Filter out apps already in collection
  const availableApps = scannedApps.filter(
    (a) => !apps.some((existing) => existing.path === a.path)
  );

  if (showAddApps) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4 bg-cream">
          <h2 className="font-medium">Add Apps</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {scanning && availableApps.length === 0 ? (
            // Show skeleton loading during scan
            <div className="space-y-1">
              {Array.from({ length: 10 }).map((_, index) => (
                <SkeletonAppListItem key={index} />
              ))}
            </div>
          ) : availableApps.length === 0 ? (
            // Show empty state when no apps available
            <p className="text-center text-gray-500">No new apps to add</p>
          ) : (
            // Show actual available apps
            <div className="space-y-1">
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

        <div className="border-t p-4 flex gap-2">
          <Button variant="secondary" onClick={() => setShowAddApps(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleAddSelectedApps}
            disabled={selectedNewApps.size === 0}
            className="flex-1"
          >
            Add ({selectedNewApps.size})
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 bg-cream">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Collection name"
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {apps.length === 0 ? (
          <p className="text-center text-gray-500">No apps in this collection</p>
        ) : (
          <div className="space-y-1">
            {apps.map((app) => (
              <AppListItem
                key={app.id}
                app={app}
                onRemove={handleRemoveApp}
                showRemove
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-4 space-y-2">
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
    </div>
  );
}
