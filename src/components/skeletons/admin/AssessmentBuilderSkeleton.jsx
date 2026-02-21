import React from 'react';
import { SkeletonBase } from '../../ui/Skeleton';

const AssessmentBuilderSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <SkeletonBase width="w-10" height="h-10" rounded="rounded-lg" />
            <SkeletonBase width="w-64" height="h-10" />
          </div>
          <SkeletonBase width="w-96" height="h-5" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar - Lista de Assessments */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <SkeletonBase width="w-32" height="h-6" />
              <SkeletonBase width="w-10" height="h-10" rounded="rounded-lg" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <SkeletonBase width="w-full" height="h-5" className="mb-2" />
                  <SkeletonBase width="w-3/4" height="h-4" />
                </div>
              ))}
            </div>
          </div>

          {/* Main Editor Area */}
          <div className="space-y-6">
            {/* Assessment Info Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <SkeletonBase width="w-48" height="h-7" className="mb-4" />
              <div className="space-y-4">
                <div>
                  <SkeletonBase width="w-24" height="h-4" className="mb-2" />
                  <SkeletonBase width="w-full" height="h-10" rounded="rounded-lg" />
                </div>
                <div>
                  <SkeletonBase width="w-32" height="h-4" className="mb-2" />
                  <SkeletonBase width="w-full" height="h-24" rounded="rounded-lg" />
                </div>
              </div>
            </div>

            {/* Indicators Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <SkeletonBase width="w-40" height="h-7" />
                <SkeletonBase width="w-32" height="h-10" rounded="rounded-lg" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <SkeletonBase width="w-10" height="h-10" rounded="rounded-full" />
                      <div className="flex-1">
                        <SkeletonBase width="w-48" height="h-5" className="mb-2" />
                        <SkeletonBase width="w-32" height="h-4" />
                      </div>
                    </div>
                    <SkeletonBase width="w-10" height="h-10" rounded="rounded-lg" />
                  </div>
                ))}
              </div>
            </div>

            {/* Questions Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <SkeletonBase width="w-32" height="h-7" className="mb-4" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border border-gray-200 rounded-lg">
                    <SkeletonBase width="w-full" height="h-6" className="mb-3" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <SkeletonBase key={j} width="w-4/5" height="h-5" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <SkeletonBase width="w-32" height="h-12" rounded="rounded-xl" />
              <SkeletonBase width="w-40" height="h-12" rounded="rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentBuilderSkeleton;
