import React from 'react';
import { SkeletonBase } from '../../ui/Skeleton';

const IndicatorsAdminSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <SkeletonBase width="w-10" height="h-10" rounded="rounded-lg" />
            <SkeletonBase width="w-56" height="h-10" />
          </div>
          <SkeletonBase width="w-96" height="h-5" />
        </div>

        {/* Create New Indicator Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <SkeletonBase width="w-48" height="h-7" className="mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <SkeletonBase width="w-24" height="h-4" className="mb-2" />
              <SkeletonBase width="w-full" height="h-10" rounded="rounded-lg" />
            </div>
            <div>
              <SkeletonBase width="w-32" height="h-4" className="mb-2" />
              <SkeletonBase width="w-full" height="h-10" rounded="rounded-lg" />
            </div>
            <div>
              <SkeletonBase width="w-16" height="h-4" className="mb-2" />
              <SkeletonBase width="w-full" height="h-10" rounded="rounded-lg" />
            </div>
            <div>
              <SkeletonBase width="w-20" height="h-4" className="mb-2" />
              <SkeletonBase width="w-full" height="h-10" rounded="rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end">
            <SkeletonBase width="w-40" height="h-11" rounded="rounded-xl" />
          </div>
        </div>

        {/* Indicators List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <SkeletonBase width="w-40" height="h-7" className="mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div 
                key={i} 
                className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <SkeletonBase width="w-12" height="h-12" rounded="rounded-full" />
                    <div className="flex-1">
                      <SkeletonBase width="w-48" height="h-6" className="mb-2" />
                      <SkeletonBase width="w-64" height="h-4" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SkeletonBase width="w-10" height="h-10" rounded="rounded-lg" />
                    <SkeletonBase width="w-10" height="h-10" rounded="rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorsAdminSkeleton;
