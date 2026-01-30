import React from 'react';
import { App } from '../../../shared/types';

interface AppListItemProps {
  app: App;
  selected?: boolean;
  onToggle?: (app: App) => void;
  onRemove?: (app: App) => void;
  showCheckbox?: boolean;
  showRemove?: boolean;
}

export function AppListItem({
  app,
  selected = false,
  onToggle,
  onRemove,
  showCheckbox = false,
  showRemove = false,
}: AppListItemProps) {
  return (
    <div className="flex items-center gap-3 p-2 hover:bg-cream-dark rounded">
      {showCheckbox && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle?.(app)}
          className="w-4 h-4 accent-blue-500"
        />
      )}

      <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center text-xs">
        {app.name.charAt(0).toUpperCase()}
      </div>

      <span className="flex-1 truncate">{app.name}</span>

      {showRemove && (
        <button
          onClick={() => onRemove?.(app)}
          className="text-red-500 hover:text-red-700 px-2"
        >
          ×
        </button>
      )}
    </div>
  );
}
