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
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
        selected
          ? 'border-brand-green bg-surface-feature ring-2 ring-brand-green/30'
          : 'border-hairline bg-canvas active:bg-surface'
      }`}
    >
      {showCheckbox && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle?.(app)}
          className="h-4 w-4 accent-brand-green"
        />
      )}

      {app.icon ? (
        <img src={`file://${app.icon}`} alt="" className="h-7 w-7 rounded-md object-contain" />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-green-soft text-xs font-semibold text-brand-green-dark">
          {app.name.charAt(0).toUpperCase()}
        </div>
      )}

      <span className="flex-1 truncate text-sm text-ink">{app.name}</span>

      {showRemove && (
        <button
          onClick={() => onRemove?.(app)}
          className="rounded-full px-2 text-lg leading-none text-red-600 active:bg-red-50"
          title="Remove app"
        >
          ×
        </button>
      )}
    </div>
  );
}
