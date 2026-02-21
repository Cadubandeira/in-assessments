import React from 'react';
import { Zap, Award } from 'lucide-react';

/**
 * XP Reward Widget - Minimalista
 * Widget compacto mostrando XP e faixas de bônus
 * Ideal para exibir ao lado de outros cards
 */
const XPRewardWidget = ({ difficulty = 'hard' }) => {
  // XP values based on difficulty
  const xpByDifficulty = {
    easy: { base: 150, max: 300 },
    medium: { base: 200, max: 400 },
    hard: { base: 250, max: 425 }
  };

  const xpInfo = xpByDifficulty[difficulty] || xpByDifficulty.hard;

  const bonusTypes = [
    { label: 'Empatia', value: 50, color: 'from-red-400 to-pink-500' },
    { label: 'Equilíbrio', value: 50, color: 'from-blue-400 to-cyan-500' },
    { label: 'Liderança', value: 75, color: 'from-yellow-400 to-orange-500' },
    { label: 'Velocidade', value: 25, color: 'from-purple-400 to-pink-500' },
    { label: 'Redução Viés', value: 25, color: 'from-green-400 to-emerald-500' }
  ];

  return (
    <div className="w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
      {/* Header com XP Total */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} fill="currentColor" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600">Ganhe até</p>
            <p className="text-lg font-bold text-indigo-600">{xpInfo.max} XP</p>
          </div>
        </div>
        <Award className="w-5 h-5 text-amber-500" />
      </div>

      {/* Faixas de Bônus */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-700 mb-2">FAIXAS DE BÔNUS</p>
        <div className="grid grid-cols-2 gap-2">
          {bonusTypes.map((bonus, idx) => (
            <div 
              key={idx}
              className={`bg-gradient-to-r ${bonus.color} rounded-lg p-2 text-white shadow-sm hover:shadow transition-all cursor-default group`}
            >
              <p className="text-xs font-semibold group-hover:translate-y-[-2px] transition-transform">{bonus.label}</p>
              <p className="text-sm font-bold">+{bonus.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Range Visual */}
      <div className="mt-3 pt-3 border-t border-indigo-100">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">XP Base</span>
            <span className="text-xs font-bold text-indigo-600">{xpInfo.base}</span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
              style={{ width: `${(xpInfo.base / xpInfo.max) * 100}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-gray-600">Máximo</span>
            <span className="text-xs font-bold text-purple-600">{xpInfo.max}</span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 transition-all duration-500"
              style={{ width: '100%' }}
            ></div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <p className="text-xs text-center text-indigo-700 font-semibold mt-3 pt-2 border-t border-indigo-100">
        Complete o cenário para desbloqueador sua recompensa
      </p>
    </div>
  );
};

export default XPRewardWidget;
