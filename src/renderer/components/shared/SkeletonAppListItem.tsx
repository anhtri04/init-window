import React from 'react';

export function SkeletonAppListItem() {
  return (
    <div className="flex items-center gap-3 p-2 rounded">
      {/* Checkbox skeleton */}
      <div className="w-4 h-4 bg-gray-300 rounded skeleton-shimmer" />

      {/* Icon skeleton */}
      <div className="w-6 h-6 bg-gray-300 rounded skeleton-shimmer" />

      {/* Text skeleton */}
      <div className="flex-1">
        <div className="h-4 bg-gray-300 rounded skeleton-shimmer w-3/4" />
      </div>
    </div>
  );
}
