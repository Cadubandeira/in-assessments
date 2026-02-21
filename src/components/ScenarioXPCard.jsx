import React from 'react';
import { Zap, TrendingUp, Trophy } from 'lucide-react';

/**
 * Scenario XP Card Component
 * Pre-scenario display showing potential XP reward and bonus opportunities
 */
const ScenarioXPCard = ({ scenarioId, difficulty = 'hard' }) => {
  // XP values based on difficulty
  const xpByDifficulty = {
    easy: { base: 150, max: 300 },
    medium: { base: 200, max: 400 },
    hard: { base: 250, max: 500 }
  };

  const xpInfo = xpByDifficulty[difficulty] || xpByDifficulty.hard;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all">
      <div className="flex items-start gap-4">
        {/* XP Icon */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <Zap className="w-7 h-7 text-white" strokeWidth={2.5} fill="currentColor" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900">Recompensa de Experiência</h3>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-semibold">
              Novo!
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            Complete esta simulação para ganhar experiência e desbloqueador bônus
          </p>

          {/* XP Range */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded-lg p-2 border border-indigo-100">
              <p className="text-xs text-gray-500 mb-1">XP Base</p>
              <p className="text-lg font-bold text-indigo-600">{xpInfo.base}</p>
            </div>
            <div className="bg-white rounded-lg p-2 border border-green-100">
              <p className="text-xs text-gray-500 mb-1">Com Bônus</p>
              <p className="text-lg font-bold text-green-600">+{xpInfo.max - xpInfo.base}</p>
            </div>
          </div>

          {/* Bonus opportunities */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Bônus Disponíveis:
            </p>
            <ul className="text-xs text-gray-600 space-y-1 ml-5 list-disc">
              <li>Empatia & Análise: +50 XP</li>
              <li>Velocidade: +25 XP</li>
              <li>Equilíbrio Cognitivo: +50 XP</li>
              <li>Redução de Vieses: +25 XP</li>
              <li>Liderança de Time: +75 XP</li>
            </ul>
          </div>

          {/* Callout */}
          <p className="text-xs text-indigo-700 font-semibold mt-3 flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Complete o cenário para desbloquear sua recompensa
          </p>
        </div>
      </div>
    </div>
  );
};

export default ScenarioXPCard;
