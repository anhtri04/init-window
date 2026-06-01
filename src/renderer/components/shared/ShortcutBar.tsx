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
    <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-hairline bg-canvas px-3 py-2 text-xs text-slate">
      {shortcuts.map((s, i) => (
        <span key={i}>
          <kbd className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-steel">
            {s.key}
          </kbd>{' '}
          {s.label}
        </span>
      ))}
    </div>
  );
}
