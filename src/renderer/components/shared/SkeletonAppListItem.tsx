import React from 'react';

export function SkeletonAppListItem() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-hairline bg-canvas px-3 py-2">
      <div className="h-4 w-4 rounded bg-hairline skeleton-shimmer" />
      <div className="h-7 w-7 rounded-md bg-hairline skeleton-shimmer" />
      <div className="flex-1">
        <div className="h-4 w-3/4 rounded bg-hairline skeleton-shimmer" />
      </div>
    </div>
  );
}
