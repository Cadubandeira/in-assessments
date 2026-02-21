import React from 'react';
import { SkeletonBase } from '../ui/Skeleton';

const RealScenariosSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-16 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 relative z-10 w-full text-left">
          <SkeletonBase width="w-64" height="h-10" className="mb-4" />
          <SkeletonBase width="w-96" height="h-6" />
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full pb-16">
        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i} 
              className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <SkeletonBase width="w-12" height="h-12" rounded="rounded-xl" />
                <SkeletonBase width="w-20" height="h-6" rounded="rounded-full" />
              </div>
              <SkeletonBase width="w-full" height="h-7" className="mb-3" />
              <SkeletonBase width="w-full" height="h-4" className="mb-2" />
              <SkeletonBase width="w-4/5" height="h-4" className="mb-6" />
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <SkeletonBase width="w-24" height="h-5" />
                <SkeletonBase width="w-24" height="h-9" rounded="rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default RealScenariosSkeleton;
