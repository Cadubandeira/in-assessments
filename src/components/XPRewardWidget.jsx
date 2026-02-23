import React from 'react';
import { Zap, Check, X } from 'lucide-react';

/**
 * Card global de XP ganha, extraído de Results.jsx
 * Props:
 *  - totalXp: número (XP total)
 *  - bonusXp: número (XP bônus)
 *  - xpConfig: objeto de configuração de XP (base, bonusThresholds)
 *  - reached80, reached90, reached100: booleanos
 *  - bonus80, bonus90, bonus100: números
 *  - formatXP: função para formatar XP
 */
export default function XPRewardWidget({
  totalXp,
  bonusXp,
  xpConfig,
  reached80,
  reached90,
  reached100,
  bonus80,
  bonus90,
  bonus100,
  formatXP = v => v
}) {
  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/60 rounded-2xl p-6 sm:p-8 shadow-lg self-start overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-2xl -z-10"></div>
      <div className="relative">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Zap className="w-6 h-6 text-white" strokeWidth={2.5} fill="currentColor" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700 mb-1">XP conquistada</p>
            <p className="text-sm text-gray-600">Com base no seu resultado para esta atividade</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              {formatXP(totalXp)}
            </div>
            {bonusXp > 0 && (
              <div className="text-xs font-semibold text-indigo-700">+{bonusXp} XP bonus</div>
            )}
          </div>
        </div>
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/90 border border-indigo-200/70 shadow-sm">
            <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[#E0E7FF] text-[#4F46E5]">
              <Check className="w-3 h-3" />
            </div>
            <span className="text-[#1E1B4B] font-semibold flex-1">Completar assessment</span>
            <span className="font-semibold text-indigo-700">+{xpConfig.base} XP</span>
          </div>
          <div className={`flex items-center gap-3 p-2 rounded-lg ${reached80 ? 'bg-white/70' : 'bg-white/40 opacity-60'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${reached80 ? 'bg-[#E0E7FF] text-[#4F46E5]' : 'bg-[#F1F5FF] text-[#6366F1]'}`}>
              {reached80 ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            </div>
            <span className={`flex-1 ${reached80 ? 'text-gray-700' : 'text-gray-500'}`}>Resultado de 80 a 89%</span>
            <span className={`font-semibold ${reached80 ? 'text-purple-600' : 'text-gray-500 line-through'}`}>
              +{bonus80} XP
            </span>
          </div>
          <div className={`flex items-center gap-3 p-2 rounded-lg ${reached90 ? 'bg-white/70' : 'bg-white/40 opacity-60'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${reached90 ? 'bg-[#E0E7FF] text-[#4F46E5]' : 'bg-[#F1F5FF] text-[#6366F1]'}`}>
              {reached90 ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            </div>
            <span className={`flex-1 ${reached90 ? 'text-gray-700' : 'text-gray-500'}`}>Resultado de 90 a 99%</span>
            <span className={`font-semibold ${reached90 ? 'text-purple-600' : 'text-gray-500 line-through'}`}>
              +{bonus90} XP
            </span>
          </div>
          <div className={`flex items-center gap-3 p-2 rounded-lg ${reached100 ? 'bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300/50' : 'bg-white/40 opacity-60'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${reached100 ? 'bg-[#E0E7FF] text-[#4F46E5]' : 'bg-[#F1F5FF] text-[#6366F1]'}`}>
              {reached100 ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            </div>
            <span className={`flex-1 ${reached100 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>Resultado de 100%</span>
            <span className={`font-semibold ${reached100 ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600' : 'text-gray-500 line-through'}`}>
              +{bonus100} XP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
