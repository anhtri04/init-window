import React from 'react';

interface ShortcutHint {
  key: string;
  label: string;
}

interface ShortcutBarProps {
  shortcuts: ShortcutHint[];
}

export function ShortcutBar({ shortcuts }: ShortcutBarProps) {
  if (shortcuts.length === 0) return null;

  return (
    <div className="bg-gray-50 border-t px-3 py-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
      {shortcuts.map((s, i) => (
        <span key={i}>
          <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-mono">
            {s.key}
          </kbd>{' '}
          {s.label}
        </span>
      ))}
    </div>
  );
}