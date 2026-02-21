import React from 'react';
import { SkeletonBase } from '../ui/Skeleton';

const HistorySkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden">
      {/* Hero Section - Igual à página real */}
      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-16 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 relative z-10 w-full text-left">
          <SkeletonBase width="w-48" height="h-4" className="mb-2" />
          <SkeletonBase width="w-40" height="h-12" />
        </div>
      </section>

      {/* Main Content com -mt-16 igual ao real */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full pb-16">
        {/* Stats Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/90 backdrop-blur-sm border border-white/60 rounded-2xl p-5 shadow-sm">
              <SkeletonBase width="w-24" height="h-3" className="mb-2" />
              <SkeletonBase width="w-16" height="h-8" className="mb-1" />
              <SkeletonBase width="w-32" height="h-3" />
            </div>
          ))}
        </section>

        {/* Filters */}
        <div className="flex justify-end items-center gap-3 mb-6">
          <SkeletonBase width="w-20" height="h-10" rounded="rounded-lg" />
          <SkeletonBase width="w-40" height="h-10" rounded="rounded-lg" />
        </div>

        {/* History Cards */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <SkeletonBase width="w-16" height="h-16" rounded="rounded-2xl" className="flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonBase width="w-64" height="h-6" />
                  <SkeletonBase width="w-48" height="h-4" />
                  <SkeletonBase width="w-32" height="h-4" />
                </div>
                <div className="flex gap-2">
                  <SkeletonBase width="w-24" height="h-10" rounded="rounded-lg" />
                  <SkeletonBase width="w-24" height="h-10" rounded="rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default HistorySkeleton;
