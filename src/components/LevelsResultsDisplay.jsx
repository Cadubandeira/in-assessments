import React, { useState, useMemo } from 'react';
import LevelBadge from './LevelBadge';
import LevelDetailModal from './LevelDetailModal';
import { TOKENS } from '../config/tokens';

export default function LevelsResultsDisplay({ levelResults, levelMode, levels, noLevelAchievedTitle, noLevelAchievedDescription }) {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [showLevelModal, setShowLevelModal] = useState(false);

  // Determinar quais níveis foram obtidos (levelScore >= acquire_threshold)
  const achievedLevels = useMemo(() => {
    return Object.values(levelResults)
      .filter(levelResult => {
        const levelConfig = levels.find(l => l.id === levelResult.level_id);
        const threshold = levelConfig?.acquire_threshold || 0;
        return levelResult.levelScore >= threshold;
      })
      .sort((a, b) => b.display_order - a.display_order); // Ordenar em reverso (maior ordem primeiro)
  }, [levelResults, levels]);

  const handleLevelClick = (level) => {
    setSelectedLevel(level);
    setShowLevelModal(true);
  };

  // MODO SINGLE: EXIBIR MAIOR NÍVEL OBTIDO
  if (levelMode === 'single') {
    const highestLevel = achievedLevels.length > 0 ? achievedLevels[0] : null;

    return (
      <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-8 shadow-lg">
        <h2 className={`text-3xl font-bold mb-8 bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
          Nível Conquistado
        </h2>

        {highestLevel ? (
          <div className="flex flex-col items-center text-center gap-6">
            {/* Emblema Grande */}
            <div className="transform scale-125">
              <LevelBadge level={highestLevel} isAchieved={true} />
            </div>

            {/* Informações do Nível */}
            <div className="max-w-md">
              <h3 className="text-2xl font-bold text-[#1E1B4B] mb-3">
                {highestLevel.name}
              </h3>
              {highestLevel.description && (
                <p className="text-gray-700 leading-relaxed mb-4">
                  {highestLevel.description}
                </p>
              )}

              {/* Score Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Pontuação:</p>
                <p className="text-2xl font-bold text-[#4F46E5]">
                  {Math.round(highestLevel.levelScore)} / {Math.round(highestLevel.maxLevelScore)} pontos
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Nenhum nível obtido
          <div className="flex flex-col items-center text-center gap-6 p-8 bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl border-2 border-rose-200">
            <div className="text-6xl">❌</div>
            {noLevelAchievedTitle && (
              <h3 className="text-2xl font-bold text-rose-800">
                {noLevelAchievedTitle}
              </h3>
            )}
            {noLevelAchievedDescription && (
              <p className="text-gray-700 leading-relaxed max-w-md">
                {noLevelAchievedDescription}
              </p>
            )}
          </div>
        )}

        <LevelDetailModal
          isOpen={showLevelModal}
          level={selectedLevel}
          onClose={() => setShowLevelModal(false)}
        />
      </div>
    );
  }

  // MODO MULTI: EXIBIR TODOS OS NÍVEIS OBTIDOS COM EMBLEMAS
  if (levelMode === 'multi') {
    const allLevels = levels
      .sort((a, b) => a.display_order - b.display_order)
      .map(level => {
        const levelResult = levelResults[level.id];
        const threshold = level.acquire_threshold || 0;
        const isAchieved = levelResult && levelResult.levelScore >= threshold;
        
        return {
          ...level,
          ...levelResult,
          isAchieved,
        };
      });

    const unachievedLevels = allLevels.filter(l => !l.isAchieved);

    return (
      <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-8 shadow-lg">
        <h2 className={`text-3xl font-bold mb-6 bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
          Níveis Conquistados
        </h2>

        {achievedLevels.length > 0 ? (
          <>
            {/* Mensagem Interativa */}
            <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
              <p className="text-blue-800 font-medium">
                💬 Clique sobre um emblema para ver mais sobre o nível obtido.
              </p>
            </div>

            {/* Grid de Emblemas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
              {allLevels.map((level) => (
                <div
                  key={level.id}
                  onClick={() => level.isAchieved && handleLevelClick(level)}
                  className="flex justify-center"
                >
                  <LevelBadge
                    level={level}
                    isAchieved={level.isAchieved}
                    onClick={() => level.isAchieved && handleLevelClick(level)}
                    interactive={level.isAchieved}
                  />
                </div>
              ))}
            </div>

            {/* Detalhes dos Níveis Conquistados */}
            <div className="mt-8 space-y-4">
              <h3 className="text-lg font-bold text-[#1E1B4B] mb-4">Resumo dos Níveis</h3>
              {achievedLevels.map((level) => (
                <div
                  key={level.level_id}
                  className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-[#4F46E5] text-lg mb-1">
                        ✓ {level.name}
                      </h4>
                      {level.description && (
                        <p className="text-gray-700 text-sm mb-2">
                          {level.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-600">
                        Pontuação: {Math.round(level.levelScore)} / {Math.round(level.maxLevelScore)} pontos
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Níveis Não Obtidos */}
            {unachievedLevels.length > 0 && (
              <div className="mt-8 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                <h4 className="font-bold text-amber-800 mb-3">Níveis Não Conquistados</h4>
                <div className="space-y-2">
                  {unachievedLevels.map((level) => (
                    <div key={level.id} className="text-sm text-amber-900">
                      <p className="font-medium">⭕ {level.name}</p>
                      {level.not_acquired_description && (
                        <p className="text-amber-800 italic text-xs mt-1">
                          {level.not_acquired_description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          // Nenhum nível obtido
          <div className="flex flex-col items-center text-center gap-6 p-8 bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl border-2 border-rose-200">
            <div className="text-6xl">❌</div>
            {noLevelAchievedTitle && (
              <h3 className="text-2xl font-bold text-rose-800">
                {noLevelAchievedTitle}
              </h3>
            )}
            {noLevelAchievedDescription && (
              <p className="text-gray-700 leading-relaxed max-w-md">
                {noLevelAchievedDescription}
              </p>
            )}
          </div>
        )}

        <LevelDetailModal
          isOpen={showLevelModal}
          level={selectedLevel}
          onClose={() => setShowLevelModal(false)}
        />
      </div>
    );
  }

  return null;
}
