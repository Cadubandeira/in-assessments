import React from 'react';
import { SkeletonBase } from '../ui/Skeleton';

const ActivitiesSkeleton = () => {
  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando atividades"
    >
      {/* Screen reader only text */}
      <span className="sr-only">Carregando lista de atividades disponíveis...</span>
      {/* Hero Section - Igual à página real */}
      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-24 px-4 sm:px-6 relative overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-16 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl" aria-hidden="true"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl" aria-hidden="true"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 relative z-10 w-full text-left">
          <SkeletonBase width="w-48" height="h-12" />
        </div>
      </section>

      {/* Main Content com -mt-16 igual ao real */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full pb-16" aria-hidden="true">
        {/* Highlight Cards Grid */}
        <section className="mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-3xl p-[1px] bg-gradient-to-br from-[#4F46E5] via-[#7C6FF6] to-[#C4B5FD] shadow-xl">
                <div className="h-full rounded-3xl bg-gradient-to-br from-[#EDE9FF] via-[#F8F7FF] to-[#EEF2FF] border border-white/70 p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-5">
                    <SkeletonBase width="w-32" height="h-6" rounded="rounded-full" />
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <SkeletonBase width="w-16" height="h-16" rounded="rounded-2xl" />
                    <div className="flex-1">
                      <SkeletonBase width="w-48" height="h-8" className="mb-2" />
                      <SkeletonBase width="w-64" height="h-4" />
                    </div>
                  </div>
                  <SkeletonBase width="w-full" height="h-4" className="mb-2" />
                  <SkeletonBase width="w-3/4" height="h-4" className="mb-6" />
                  <SkeletonBase width="w-32" height="h-12" rounded="rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Activities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i} 
              className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              <SkeletonBase width="w-16" height="h-16" rounded="rounded-2xl" className="mb-4" />
              <SkeletonBase width="w-48" height="h-7" className="mb-3" />
              <SkeletonBase width="w-full" height="h-4" className="mb-2" />
              <SkeletonBase width="w-3/4" height="h-4" className="mb-6" />
              <div className="flex items-center justify-between">
                <SkeletonBase width="w-24" height="h-6" rounded="rounded-full" />
                <SkeletonBase width="w-20" height="h-8" rounded="rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ActivitiesSkeleton;
