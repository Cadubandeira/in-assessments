import React from 'react';
import { SkeletonBase } from '../ui/Skeleton';

const AssessmentSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="space-y-10 pt-8">
          {/* Title Section */}
          <div className="text-center mb-12">
            <div className="inline-block mb-6">
              <SkeletonBase width="w-32" height="h-8" rounded="rounded-full" />
            </div>
            <SkeletonBase width="w-96" height="h-10" className="mb-4 mx-auto" />
            <SkeletonBase width="w-full max-w-2xl" height="h-6" className="mx-auto" />
          </div>

          {/* Question Card */}
          <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
            <div className="mb-6">
              <SkeletonBase width="w-32" height="h-4" className="mb-3" />
              <SkeletonBase width="w-full" height="h-8" className="mb-2" />
              <SkeletonBase width="w-5/6" height="h-8" />
            </div>

            {/* Options */}
            <div className="space-y-3 mt-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i} 
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-[#4F46E5]/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <SkeletonBase width="w-4/5" height="h-5" />
                    <SkeletonBase width="w-5" height="h-5" rounded="rounded-full" />
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Button */}
            <div className="mt-8 flex justify-end">
              <SkeletonBase width="w-32" height="h-12" rounded="rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AssessmentSkeleton;
