import React from 'react';
import { Zap, Award, TrendingUp } from 'lucide-react';

const XPResultCard = ({ 
  totalXPGained, 
  breakdown = [], // array de { label, xp, achieved }
  performancePercentage,
  nextLevelXP,
  currentLevelXP
}) => {
  const progressToNextLevel = currentLevelXP && nextLevelXP 
    ? ((currentLevelXP + totalXPGained) % nextLevelXP) / nextLevelXP * 100
    : 0;

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-3xl p-8 sm:p-12 shadow-xl">
      {/* Header com ícone */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Zap className="w-8 h-8 text-white" strokeWidth={2.5} fill="currentColor" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">Pontos Ganhos</p>
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              +{totalXPGained}
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown de pontos */}
      {breakdown.length > 0 && (
        <div className="mb-8 space-y-3">
          <p className="text-sm font-bold text-gray-700 mb-4">Detalhamento:</p>
          {breakdown.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-3 rounded-lg ${
                item.achieved
                  ? 'bg-white/60 border border-green-200'
                  : 'bg-gray-100/50 border border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.achieved ? (
                  <Award className="w-5 h-5 text-green-500" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                )}
                <span className={item.achieved ? 'text-gray-700 font-medium' : 'text-gray-500'}>
                  {item.label}
                </span>
              </div>
              <span className={`font-bold ${item.achieved ? 'text-green-600' : 'text-gray-400'}`}>
                +{item.xp} XP
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Progress to next level */}
      {currentLevelXP !== undefined && nextLevelXP !== undefined && (
        <div className="bg-white/70 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Progresso para próximo nível</p>
            <span className="text-xs font-bold text-indigo-600">{Math.round(progressToNextLevel)}%</span>
          </div>
          <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
              style={{ width: `${progressToNextLevel}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Performance info */}
      {performancePercentage !== undefined && (
        <div className="mt-6 pt-6 border-t border-indigo-200/50">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-sm text-gray-600">Desempenho</p>
              <p className="text-lg font-bold text-indigo-600">{performancePercentage}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XPResultCard;
