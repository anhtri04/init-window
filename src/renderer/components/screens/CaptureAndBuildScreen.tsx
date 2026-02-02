import React, { useState } from 'react';
import { App } from '../../../shared/types';
import { useProcessScanner } from '../../hooks/useProcessScanner';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../shared/Button';
import { AppListItem } from '../shared/AppListItem';
import { SkeletonAppListItem } from '../shared/SkeletonAppListItem';

interface CaptureAndBuildScreenProps {
  onBuildComplete: () => void;
}

// Helper to determine if an app is a user app (not Microsoft/Windows system app)
function isUserApp(app: App): boolean {
  const lowerPath = app.path.toLowerCase();
  // Exclude Microsoft and Windows system paths
  return (
    !lowerPath.includes('microsoft') &&
    !lowerPath.includes('windows') &&
    !lowerPath.startsWith('c:\\windows') &&
    !lowerPath.startsWith('c:\\programdata') &&
    !app.name.toLowerCase().startsWith('windows')
  );
}

export function CaptureAndBuildScreen({ onBuildComplete }: CaptureAndBuildScreenProps) {
  const { apps, scanning, scan, clear } = useProcessScanner();
  const { collections, createCollection } = useAppContext();
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [collectionName, setCollectionName] = useState('');
  const [filterUserApps, setFilterUserApps] = useState(false);

  const handleToggle = (app: App) => {
    setSelectedApps((prev) => {
      const next = new Set(prev);
      if (next.has(app.id)) {
        next.delete(app.id);
      } else {
        next.add(app.id);
      }
      return next;
    });
  };

  // Filter apps based on toggle
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
    await createCollection(name, selected);

    // Reset state
    setSelectedApps(new Set());
    setCollectionName('');
    setFilterUserApps(false);
    clear();
    onBuildComplete();
  };

  return (
    <div className="flex flex-col h-full">
      {/* App list */}
      <div className="flex-1 overflow-y-auto p-4">
        {scanning && apps.length === 0 ? (
          // Show skeleton loading during initial scan
          <div className="space-y-1">
            {Array.from({ length: 10 }).map((_, index) => (
              <SkeletonAppListItem key={index} />
            ))}
          </div>
        ) : apps.length === 0 ? (
          // Show empty state when not scanning and no apps
          <div className="text-center text-gray-500 mt-8">
            <p className="mb-4">Click the button below to scan running applications</p>
          </div>
        ) : (
          // Show actual apps
          <>
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {displayedApps.length} apps{displayedApps.length !== apps.length && ` (of ${apps.length})`}
                </span>
                <button
                  onClick={() => setFilterUserApps(!filterUserApps)}
                  className={`text-xs px-2 py-1 rounded ${
                    filterUserApps
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {filterUserApps ? 'Filter: User Apps' : 'Filter'}
                </button>
              </div>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                {selectedApps.size === displayedApps.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-1">
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

      {/* Bottom section */}
      <div className="border-t bg-cream p-4 space-y-3">
        {apps.length > 0 && (
          <input
            type="text"
            placeholder={`Collection ${collections.length + 1}`}
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}

        <div className="flex gap-2">
          <Button
            onClick={scan}
            disabled={scanning}
            variant="secondary"
            className="flex-1"
          >
            {scanning ? 'Scanning...' : apps.length > 0 ? 'Rescan' : 'Capture Running Apps'}
          </Button>

          {apps.length > 0 && (
            <Button
              onClick={handleBuild}
              disabled={selectedApps.size === 0}
              className="flex-1"
            >
              Build ({selectedApps.size})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
