import React from 'react';
import { SkeletonBase } from '../ui/Skeleton';

const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF] overflow-x-hidden">
      {/* HERO SECTION - Replica a estrutura exata do Dashboard */}
      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-32 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-20 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 relative z-10 w-full">
          <SkeletonBase width="w-32" height="h-4" className="mb-2" />
          <SkeletonBase width="w-96" height="h-12" className="mb-2" />
          <SkeletonBase width="w-80" height="h-12" />
        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL - Com margin negativo igual ao real */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-24 relative z-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          
          {/* COLUNA ESQUERDA */}
          <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full">
            
            {/* CARD DE PERFORMANCE */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/50 p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-xl w-full">
              <div className="flex flex-col md:flex-row items-center gap-4 sm:gap-6 md:gap-8 relative w-full">
                {/* Coluna Esquerda - Nível */}
                <div className="w-full md:w-1/3 text-center md:text-left">
                  <SkeletonBase width="w-24" height="h-3" className="mb-1 mx-auto md:mx-0" />
                  <SkeletonBase width="w-16" height="h-12" className="mb-2 mx-auto md:mx-0" />
                  <SkeletonBase width="w-28" height="h-6" rounded="rounded-full" className="mx-auto md:mx-0" />
                </div>
                {/* Coluna Direita - Progresso e Ranking */}
                <div className="w-full md:w-2/3 flex flex-col gap-4">
                  <div className="flex flex-col gap-3">
                    {/* Ranking Badge e Progress Info */}
                    <div className="flex items-start justify-between gap-4">
                      <SkeletonBase width="w-48" height="h-10" rounded="rounded-lg" />
                      <div className="flex flex-col items-end">
                        <SkeletonBase width="w-12" height="h-6" className="mb-1" />
                        <SkeletonBase width="w-24" height="h-4" />
                      </div>
                    </div>
                    {/* XP Bar */}
                    <SkeletonBase width="w-full" height="h-3" rounded="rounded-full" />
                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                      <SkeletonBase width="w-full" height="h-9" rounded="rounded-lg" />
                      <SkeletonBase width="w-full" height="h-9" rounded="rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* BANNER CTA ASSESSMENT */}
            <div className="bg-gradient-to-r from-[#4F46E5] to-[#6366F1] rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 w-full">
              <div className="flex items-center gap-3 sm:gap-4 md:gap-6 w-full md:w-auto">
                <div className="bg-white/20 p-3 sm:p-4 rounded-lg flex-shrink-0">
                  <SkeletonBase width="w-8" height="h-8" />
                </div>
                <div className="flex-1">
                  <SkeletonBase width="w-48" height="h-6" className="mb-2" />
                  <SkeletonBase width="w-64" height="h-4" />
                </div>
              </div>
              <SkeletonBase width="w-32" height="h-12" rounded="rounded-xl" />
            </div>

            {/* GRÁFICO */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/50 p-6 rounded-2xl shadow-xl">
              <SkeletonBase width="w-48" height="h-6" className="mb-6" />
              <div className="h-64 flex items-end justify-around gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <SkeletonBase key={i} width="w-full" height={`h-${40 + i * 10}`} />
                ))}
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6 lg:gap-8">
            {/* RANKING CARD */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/50 p-6 rounded-2xl shadow-xl">
              <SkeletonBase width="w-32" height="h-6" className="mb-4" />
              <div className="flex items-center gap-3 mb-3">
                <SkeletonBase width="w-12" height="h-12" rounded="rounded-full" />
                <div className="flex-1">
                  <SkeletonBase width="w-24" height="h-8" className="mb-1" />
                  <SkeletonBase width="w-32" height="h-4" />
                </div>
              </div>
            </div>

            {/* OUTRAS ATIVIDADES */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/50 p-6 rounded-2xl shadow-xl">
              <SkeletonBase width="w-40" height="h-6" className="mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl">
                    <SkeletonBase width="w-full" height="h-5" className="mb-2" />
                    <SkeletonBase width="w-3/4" height="h-4" />
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

export default DashboardSkeleton;
