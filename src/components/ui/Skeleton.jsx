import React from 'react';

/**
 * Componente base para criar efeitos de skeleton loading
 */
export const SkeletonBase = ({ className = '', width = 'w-full', height = 'h-4', rounded = 'rounded' }) => {
  return (
    <div 
      className={`${width} ${height} ${rounded} bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer bg-[length:200%_100%] ${className}`}
    />
  );
};

/**
 * Skeleton para textos
 */
export const SkeletonText = ({ lines = 1, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase 
          key={i} 
          width={i === lines - 1 ? 'w-3/4' : 'w-full'} 
          height="h-4" 
        />
      ))}
    </div>
  );
};

/**
 * Skeleton para cards
 */
export const SkeletonCard = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 ${className}`}>
      <SkeletonBase width="w-16" height="h-16" rounded="rounded-full" className="mb-4" />
      <SkeletonBase width="w-24" height="h-6" className="mb-2" />
      <SkeletonBase width="w-full" height="h-4" />
    </div>
  );
};

/**
 * Skeleton para gráficos
 */
export const SkeletonChart = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 ${className}`}>
      <SkeletonBase width="w-32" height="h-6" className="mb-6" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBase width="w-20" height="h-4" />
            <SkeletonBase width={`w-${Math.floor(Math.random() * 40 + 40)}%`} height="h-8" rounded="rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton para botões
 */
export const SkeletonButton = ({ className = '' }) => {
  return <SkeletonBase width="w-32" height="h-12" rounded="rounded-xl" className={className} />;
};
