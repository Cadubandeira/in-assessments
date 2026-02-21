import React from 'react';
import { SkeletonBase } from '../ui/Skeleton';

const ResultsSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 pt-8">
        {/* Header Section - Replica estrutura exata */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <SkeletonBase width="w-32" height="h-8" rounded="rounded-full" />
          </div>
          <SkeletonBase width="w-96" height="h-10" className="mb-4 mx-auto" />
          <SkeletonBase width="w-full max-w-2xl" height="h-6" className="mx-auto" />
        </div>

        {/* Grid Layout - Igual ao real */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
          
          {/* Coluna Esquerda - Gráficos */}
          <div className="space-y-6">
            {/* Card de Score Geral */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <SkeletonBase width="w-48" height="h-8" className="mb-2" />
                  <SkeletonBase width="w-32" height="h-6" />
                </div>
                <SkeletonBase width="w-20" height="h-20" rounded="rounded-full" />
              </div>
              <SkeletonBase width="w-full" height="h-4" rounded="rounded-full" />
            </div>

            {/* Gráfico Radar */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-lg">
              <SkeletonBase width="w-40" height="h-6" className="mb-6" />
              <div className="h-80 flex items-center justify-center">
                <SkeletonBase width="w-64" height="h-64" rounded="rounded-full" />
              </div>
            </div>

            {/* Gráfico de Barras */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-lg">
              <SkeletonBase width="w-48" height="h-6" className="mb-6" />
              <div className="space-y-4">
                {[90, 75, 85, 60, 80].map((width, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <SkeletonBase width="w-24" height="h-4" />
                    <SkeletonBase width={`w-[${width}%]`} height="h-8" rounded="rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna Direita - Indicadores */}
          <div className="space-y-6">
            {/* XP Card */}
            <div className="bg-gradient-to-br from-[#4F46E5] to-[#6366F1] rounded-2xl p-6 shadow-lg text-white">
              <SkeletonBase width="w-32" height="h-6" className="mb-4 bg-white/30" />
              <SkeletonBase width="w-24" height="h-10" className="mb-2 bg-white/40" />
              <SkeletonBase width="w-40" height="h-4" className="bg-white/30" />
            </div>

            {/* Indicadores */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <SkeletonBase width="w-10" height="h-10" rounded="rounded-full" />
                  <div className="flex-1">
                    <SkeletonBase width="w-32" height="h-5" className="mb-2" />
                    <SkeletonBase width="w-20" height="h-4" />
                  </div>
                </div>
                <SkeletonBase width="w-full" height="h-2" rounded="rounded-full" className="mb-3" />
                <SkeletonBase width="w-full" height="h-4" className="mb-1" />
                <SkeletonBase width="w-4/5" height="h-4" />
              </div>
            ))}

            {/* Botões de ação */}
            <div className="space-y-3">
              <SkeletonBase width="w-full" height="h-12" rounded="rounded-xl" />
              <SkeletonBase width="w-full" height="h-12" rounded="rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResultsSkeleton;
