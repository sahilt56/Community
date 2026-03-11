import React from 'react';

const SkeletonLoader = () => {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={`bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-[#343536] rounded-xl p-4 animate-fade-up stagger-${i + 1}`}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="skeleton-shimmer w-6 h-6 rounded-full" />
            <div className="skeleton-shimmer h-3 w-32 rounded-full" />
            <div className="skeleton-shimmer h-3 w-20 rounded-full ml-2" />
          </div>
          {/* Title */}
          <div className="skeleton-shimmer h-5 w-3/4 rounded-full mb-3" />
          {/* Body lines */}
          <div className="space-y-2 mb-4">
            <div className="skeleton-shimmer h-3 w-full rounded-full" />
            <div className="skeleton-shimmer h-3 w-5/6 rounded-full" />
            <div className="skeleton-shimmer h-3 w-4/6 rounded-full" />
          </div>
          {/* Footer actions */}
          <div className="flex gap-3 mt-2">
            <div className="skeleton-shimmer h-7 w-20 rounded-full" />
            <div className="skeleton-shimmer h-7 w-24 rounded-full" />
            <div className="skeleton-shimmer h-7 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
