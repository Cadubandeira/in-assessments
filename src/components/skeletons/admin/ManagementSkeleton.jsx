import React from 'react';
import { SkeletonBase } from '../../ui/Skeleton';

const ManagementSkeleton = () => {
  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando painel gerencial"
    >
      {/* Screen reader only text */}
      <span className="sr-only">Carregando painel de gerenciamento...</span>
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-24 px-4 sm:px-6 relative overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-16 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl" aria-hidden="true"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl" aria-hidden="true"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 relative z-10 w-full">
          <SkeletonBase width="w-48" height="h-4" className="mb-2" />
          <SkeletonBase width="w-64" height="h-12" />
        </div>
      </section>

      {/* Main Content com -mt-16 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full" aria-hidden="true">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          
          {/* Coluna Esquerda - Indicadores */}
          <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-6 lg:gap-8">
            {/* Card de Indicadores */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <SkeletonBase width="w-32" height="h-7" className="mb-2" />
                  <SkeletonBase width="w-full max-w-md" height="h-4" />
                </div>
                <SkeletonBase width="w-10" height="h-10" rounded="rounded-lg" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-white">
                    <SkeletonBase width="w-10" height="h-10" rounded="rounded-full" />
                    <div className="flex-1">
                      <SkeletonBase width="w-32" height="h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Banner CTA */}
            <div className="bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 w-full">
              <div className="flex-1 min-w-0">
                <SkeletonBase width="w-64" height="h-7" className="mb-2" />
                <SkeletonBase width="w-full max-w-md" height="h-4" />
              </div>
              <SkeletonBase width="w-32" height="h-11" rounded="rounded-lg" />
            </div>
          </div>

          {/* Coluna Direita - Assessments */}
          <div className="lg:col-span-5 flex flex-col gap-4 sm:gap-6 lg:gap-8">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <SkeletonBase width="w-40" height="h-7" className="mb-2" />
                  <SkeletonBase width="w-full max-w-xs" height="h-4" />
                </div>
                <SkeletonBase width="w-10" height="h-10" rounded="rounded-lg" />
              </div>

              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 rounded-lg border border-gray-100 bg-white">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <SkeletonBase width="w-48" height="h-5" className="mb-1" />
                        <SkeletonBase width="w-32" height="h-4" />
                      </div>
                      <SkeletonBase width="w-20" height="h-6" rounded="rounded-full" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="flex items-center gap-2">
                          <SkeletonBase width="w-4" height="h-4" />
                          <SkeletonBase width="w-24" height="h-4" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManagementSkeleton;
