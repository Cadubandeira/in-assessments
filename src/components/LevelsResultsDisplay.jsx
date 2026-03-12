import React, { useState, useMemo, useEffect, useRef } from 'react';
import LevelBadge from './LevelBadge';
import LevelBadgeAlternative from './LevelBadgeAlternative';
import LevelDetailModal from './LevelDetailModal';
import RadarChart from './charts/RadarChart';
import ItemResponsesModal from './ItemResponsesModal';
import { TOKENS } from '../config/tokens';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Copiar função de cor do LevelBadgeAlternative
const generateColorFromName = (name) => {
  // Mapeamento específico para níveis Bronze, Prata, Ouro, Platina
  const nameLower = name.toLowerCase();
  if (nameLower.includes('bronze')) {
    return { bg: 'from-amber-700 to-orange-800', text: 'text-amber-900', border: 'border-amber-600' };
  }
  if (nameLower.includes('prata')) {
    return { bg: 'from-gray-300 to-gray-500', text: 'text-gray-900', border: 'border-gray-400' };
  }
  if (nameLower.includes('ouro')) {
    return { bg: 'from-yellow-400 to-yellow-600', text: 'text-yellow-900', border: 'border-yellow-500' };
  }
  if (nameLower.includes('platina')) {
    return { bg: 'from-slate-300 to-blue-400', text: 'text-slate-900', border: 'border-slate-400' };
  }
  
  const colors = [
    { bg: 'from-yellow-400 to-yellow-500', text: 'text-yellow-900', border: 'border-yellow-300' },
    { bg: 'from-blue-400 to-blue-500', text: 'text-blue-900', border: 'border-blue-300' },
    { bg: 'from-purple-400 to-purple-500', text: 'text-purple-900', border: 'border-purple-300' },
    { bg: 'from-red-400 to-red-500', text: 'text-red-900', border: 'border-red-300' },
    { bg: 'from-green-400 to-green-500', text: 'text-green-900', border: 'border-green-300' },
    { bg: 'from-indigo-400 to-indigo-500', text: 'text-indigo-900', border: 'border-indigo-300' },
    { bg: 'from-pink-400 to-pink-500', text: 'text-pink-900', border: 'border-pink-300' },
    { bg: 'from-cyan-400 to-cyan-500', text: 'text-cyan-900', border: 'border-cyan-300' },
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
};

const generateEmojiFromName = (name) => {
  const nameLower = name.toLowerCase();
  const emojiMap = {
    bronze: '🥉',
    prata: '🥈',
    ouro: '🥇',
    platina: '💎',
    diamante: '✨',
    cristal: '🔮',
    lendário: '👑',
    mítico: '🌟',
  };
  
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (nameLower.includes(key)) return emoji;
  }
  return '⭐';
};

const stripHtml = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const formatNaturalList = (items = []) => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} e ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
};

// Estilo para fade-out do texto truncado
const textFadeOutStyles = `
  .text-fade-out {
    -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
    mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  }

  .level-rich-content,
  .level-rich-content-dark {
    line-height: 1.7;
  }

  .level-rich-content p,
  .level-rich-content-dark p {
    margin: 0 0 0.75rem 0;
  }

  .level-rich-content p:last-child,
  .level-rich-content-dark p:last-child {
    margin-bottom: 0;
  }

  .level-rich-content ul,
  .level-rich-content-dark ul {
    list-style-type: disc;
    padding-left: 1.25rem;
    margin: 0.6rem 0;
  }

  .level-rich-content ol,
  .level-rich-content-dark ol {
    list-style-type: decimal;
    padding-left: 1.25rem;
    margin: 0.6rem 0;
  }

  .level-rich-content li,
  .level-rich-content-dark li {
    margin: 0.25rem 0;
  }

  .level-rich-content.ProseMirror strong,
  .level-rich-content.ProseMirror b,
  .level-rich-content-dark.ProseMirror strong,
  .level-rich-content-dark.ProseMirror b {
    font-weight: 700 !important;
  }

  .level-rich-content.ProseMirror span[style*="font-weight"],
  .level-rich-content-dark.ProseMirror span[style*="font-weight"] {
    font-weight: 700 !important;
  }

  .level-rich-content em,
  .level-rich-content-dark em {
    font-style: italic;
  }

  .level-rich-content h1,
  .level-rich-content h2,
  .level-rich-content h3,
  .level-rich-content-dark h1,
  .level-rich-content-dark h2,
  .level-rich-content-dark h3 {
    font-weight: 700;
    line-height: 1.25;
    margin: 0.8rem 0 0.45rem;
  }

  .level-rich-content h1,
  .level-rich-content-dark h1 {
    font-size: 1.35rem;
  }

  .level-rich-content h2,
  .level-rich-content-dark h2 {
    font-size: 1.2rem;
  }

  .level-rich-content h3,
  .level-rich-content-dark h3 {
    font-size: 1.05rem;
  }

  .level-rich-content a,
  .level-rich-content-dark a {
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .level-rich-content { color: #FFFFFF; }
  .level-rich-content ul,
  .level-rich-content ol,
  .level-rich-content li,
  .level-rich-content h1,
  .level-rich-content h2,
  .level-rich-content h3,
  .level-rich-content strong,
  .level-rich-content b,
  .level-rich-content em,
  .level-rich-content a,
  .level-rich-content p { color: #FFFFFF; }

  .level-rich-content-dark { color: #374151; }
`;

// Função para gerar estilo do badge baseado na porcentagem
const getLevelBadgeStyle = (percentage) => {
  if (percentage >= 80) {
    return {
      backgroundColor: '#10B981',
      color: '#FFFFFF',
    };
  } else if (percentage >= 60) {
    return {
      backgroundColor: '#3B82F6',
      color: '#FFFFFF',
    };
  } else if (percentage >= 40) {
    return {
      backgroundColor: '#F59E0B',
      color: '#FFFFFF',
    };
  } else {
    return {
      backgroundColor: '#EF4444',
      color: '#FFFFFF',
    };
  }
};

const getRadarMetricsForLevel = (levelResult = {}) => {
  const levelScore = Number(levelResult.levelScore) || 0;
  const potentialScore = Number(levelResult.potentialScore) || 0;
  const maxLevelScore = Number(levelResult.maxLevelScore) || 0;
  const maxPotentialScore = Number(levelResult.maxPotentialScore) || 0;
  const maxTotalScore = Number(levelResult.maxTotalScore) || 0;

  if (maxTotalScore > 0) {
    return {
      score: levelScore + potentialScore,
      maxScore: maxTotalScore,
    };
  }

  if (maxLevelScore > 0) {
    return {
      score: levelScore,
      maxScore: maxLevelScore,
    };
  }

  if (maxPotentialScore > 0) {
    return {
      score: potentialScore,
      maxScore: maxPotentialScore,
    };
  }

  return {
    score: 0,
    maxScore: 0,
  };
};

const getRadarPercentageForLevel = (levelResult = {}) => {
  const { score, maxScore } = getRadarMetricsForLevel(levelResult);
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
};

const getPotentialLabelFromRemainingPercentage = (remainingPercentage) => {
  if (remainingPercentage <= 0) return null;
  if (remainingPercentage <= 20) return 'MUITO ALTO';
  if (remainingPercentage <= 40) return 'ALTO';
  if (remainingPercentage <= 60) return 'MÉDIO';
  if (remainingPercentage <= 80) return 'BAIXO';
  return 'MUITO BAIXO';
};

// Componente para card individual
function LevelCardAnimated({ level, expandedLevelId, setExpandedLevelId }) {
  const [isTruncated, setIsTruncated] = useState(false);
  const descriptionRef = useRef(null);
  const colors = generateColorFromName(level.name);
  const emoji = generateEmojiFromName(level.name);

  useEffect(() => {
    // Verificar se o texto está truncado
    const checkTruncation = () => {
      if (descriptionRef.current) {
        // Pequeno delay para garantir que o layout CSS esteja estabilizado
        setTimeout(() => {
          if (descriptionRef.current) {
            // Remover line-clamp temporariamente para medir o tamanho real
            const element = descriptionRef.current;
            const originalClass = element.className;
            
            // Remover classes de truncamento
            element.className = originalClass.replace(/line-clamp-\d+/g, '').replace(/text-fade-out/g, '');
            
            // Medir altura real do conteúdo
            const fullHeight = element.scrollHeight;
            
            // Calcular altura de 5 linhas
            const computedStyle = window.getComputedStyle(element);
            const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
            const maxHeight = lineHeight * 5;
            
            // Restaurar classes originais
            element.className = originalClass;
            
            // Determinar se está truncado
            const isTruncatedNow = fullHeight > maxHeight;
            setIsTruncated(isTruncatedNow);
          }
        }, 100);
      }
    };

    checkTruncation();

    // Re-verificar quando a janela for redimensionada
    window.addEventListener('resize', checkTruncation);
    
    return () => {
      window.removeEventListener('resize', checkTruncation);
    };
  }, [level.description, expandedLevelId]);

  return (
    <div className="flex flex-col items-center">
      {/* Ícone centralizado acima do card */}
      <div className="text-7xl select-none mb-4">
        {emoji}
      </div>

      {/* Card sem ícone */}
      <div className={`w-full rounded-2xl p-5 sm:p-6 shadow-lg bg-gradient-to-br ${colors.bg} relative`}>
        {/* Label "Nível obtido" */}
        <p className="text-white font-bold text-xs uppercase tracking-widest mb-3">
          Nível obtido
        </p>

        {/* Título (sem ícone) */}
        <h4 className={`text-lg sm:text-2xl font-bold text-white leading-tight mb-5 ${TOKENS.fonts.serif}`}>
          {level.name}
        </h4>

        {/* Descrição com "Ver mais" abaixo */}
        <div>
          <p 
            ref={descriptionRef}
            className={`text-white leading-relaxed text-base ${
              expandedLevelId === level.level_id 
                ? '' 
                : isTruncated 
                  ? 'line-clamp-5 text-fade-out' 
                  : ''
            }`}
          >
            {level.description}
          </p>
          
          {/* "Ver mais" abaixo do texto quando não expandido - só se truncado */}
          {level.description && isTruncated && expandedLevelId !== level.level_id && (
            <button
              onClick={() => setExpandedLevelId(level.level_id)}
              className="mt-2 text-white font-semibold text-base hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              Ver mais <ChevronDown size={16} />
            </button>
          )}
          
          {/* "Ver menos" quando expandido - sem underline */}
          {expandedLevelId === level.level_id && (
            <button
              onClick={() => setExpandedLevelId(null)}
              className="mt-3 text-white font-semibold text-base hover:opacity-90 transition-opacity flex items-center gap-1"
            >
              Ver menos <ChevronUp size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LevelsResultsDisplay({ levelResults, levelMode, levels, levelRanges = {}, noLevelAchievedTitle, noLevelAchievedDescription, showLevelBadges = true, levelAnswerItems = {} }) {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showLevelAnswersModal, setShowLevelAnswersModal] = useState(false);
  const [selectedLevelAnswersKey, setSelectedLevelAnswersKey] = useState('');
  const [expandedLevelId, setExpandedLevelId] = useState(null);
  const [expandedInterpretations, setExpandedInterpretations] = useState({}); // Para múltiplas interpretações
  const [truncatedInterpretations, setTruncatedInterpretations] = useState({}); // Quais estão truncadas
  const [isTruncated, setIsTruncated] = useState(false);
  const descriptionRef = useRef(null);
  const interpretationRefs = useRef({}); // Refs para as interpretações dos cards

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

  const levelsSummary = useMemo(() => {
    const orderedLevels = [...levels]
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    const names = orderedLevels
      .map(level => stripHtml(level.name || ''))
      .filter(Boolean);

    return {
      count: names.length,
      namesText: formatNaturalList(names),
    };
  }, [levels]);

  const levelModalItems = useMemo(() => {
    return [...levels]
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map((level) => ({
        key: String(level.id),
        label: stripHtml(level.name || 'Nível'),
        questions: levelAnswerItems[level.id]?.questions || []
      }));
  }, [levels, levelAnswerItems]);

  // Detectar se o texto está truncado (modo single)
  useEffect(() => {
    const checkTruncation = () => {
      if (descriptionRef.current) {
        // Pequeno delay para garantir que o layout CSS esteja estabilizado
        setTimeout(() => {
          if (descriptionRef.current) {
            // Remover line-clamp temporariamente para medir o tamanho real
            const element = descriptionRef.current;
            const originalClass = element.className;
            
            // Remover classes de truncamento
            element.className = originalClass.replace(/line-clamp-\d+/g, '').replace(/text-fade-out/g, '');
            
            // Medir altura real do conteúdo
            const fullHeight = element.scrollHeight;
            
            // Calcular altura de 5 linhas
            const computedStyle = window.getComputedStyle(element);
            const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
            const maxHeight = lineHeight * 5;
            
            // Restaurar classes originais
            element.className = originalClass;
            
            // Determinar se está truncado
            const isTruncatedNow = fullHeight > maxHeight;
            setIsTruncated(isTruncatedNow);
          }
        }, 100);
      }
    };

    checkTruncation();

    // Re-verificar quando a janela for redimensionada
    window.addEventListener('resize', checkTruncation);
    
    return () => {
      window.removeEventListener('resize', checkTruncation);
    };
  }, [achievedLevels, expandedLevelId]);

  // Verificar truncamento das interpretações dos cards
  useEffect(() => {
    let animationFrameId;

    const checkInterpretationTruncation = () => {
      animationFrameId = window.requestAnimationFrame(() => {
        const newTruncated = {};

        Object.keys(interpretationRefs.current).forEach((levelId) => {
          const element = interpretationRefs.current[levelId];
          if (!element) return;

          const originalClass = element.className;
          element.className = originalClass.replace(/line-clamp-\d+/g, '').replace(/text-fade-out/g, '');

          const fullHeight = element.scrollHeight;
          const computedStyle = window.getComputedStyle(element);
          const lineHeight = parseFloat(computedStyle.lineHeight);
          const maxHeight = lineHeight * 5;

          element.className = originalClass;
          newTruncated[levelId] = fullHeight > maxHeight;
        });

        setTruncatedInterpretations(newTruncated);
      });
    };

    checkInterpretationTruncation();
    window.addEventListener('resize', checkInterpretationTruncation);
    
    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', checkInterpretationTruncation);
    };
  }, [levels, levelResults, expandedInterpretations]);

  const handleLevelClick = (level) => {
    setSelectedLevel(level);
    setShowLevelModal(true);
  };

  const openLevelAnswers = (levelId) => {
    setSelectedLevelAnswersKey(String(levelId));
    setShowLevelAnswersModal(true);
  };

  const toggleInterpretation = (levelId) => {
    setExpandedInterpretations(prev => ({
      ...prev,
      [levelId]: !prev[levelId]
    }));
  };

  // Encontrar a interpretação para um nível baseado na pontuação
  const getInterpretationForLevel = (levelId, score) => {
    const ranges = levelRanges[levelId] || [];
    if (ranges.length === 0) return null;

    // Ordenar por min_score
    const sortedRanges = [...ranges].sort((a, b) => a.min_score - b.min_score);
    
    // Encontrar a faixa que contém o score
    for (const range of sortedRanges) {
      if (score >= range.min_score && score <= range.max_score) {
        return {
          label: range.label,
          interpretation: range.interpretation
        };
      }
    }

    // Se não encontrar na faixa, usar a última
    if (sortedRanges.length > 0) {
      const lastRange = sortedRanges[sortedRanges.length - 1];
      return {
        label: lastRange.label,
        interpretation: lastRange.interpretation
      };
    }

    return null;
  };

  return (
    <>
      <style>{textFadeOutStyles}</style>
      
      {/* MODO SINGLE */}
      {levelMode === 'single' && 
        (() => {
          const highestLevel = achievedLevels.length > 0 ? achievedLevels[0] : null;
          const singleLevelCardData = highestLevel
            ? {
                levelId: highestLevel.level_id,
                label: 'Nível obtido',
                title: highestLevel.name,
                description: highestLevel.description,
                icon: 'level',
                cardBg: generateColorFromName(highestLevel.name).bg,
              }
            : {
                levelId: 'level-zero',
                label: 'Nível 0',
                title: noLevelAchievedTitle || 'Quando não conquistar nenhum nível',
                description: noLevelAchievedDescription,
                icon: 'stop',
                cardBg: generateColorFromName('Nível 0').bg,
              };

          // Preparar dados para o radar chart - TODOS os níveis
          const radarData = {};
          const radarMeta = {};
          
          // Mapa de cores para os níveis
          const colorMap = {
            // Cores específicas Bronze, Prata, Ouro, Platina
            'from-amber-700 to-orange-800': '#B45309',
            'from-gray-300 to-gray-500': '#9CA3AF',
            'from-yellow-400 to-yellow-600': '#FBBF24',
            'from-slate-300 to-blue-400': '#60A5FA',
            // Cores genéricas
            'from-yellow-400 to-yellow-500': '#FBBF24',
            'from-blue-400 to-blue-500': '#60A5FA',
            'from-purple-400 to-purple-500': '#A78BFA',
            'from-red-400 to-red-500': '#F87171',
            'from-green-400 to-green-500': '#4ADE80',
            'from-indigo-400 to-indigo-500': '#818CF8',
            'from-pink-400 to-pink-500': '#F472B6',
            'from-cyan-400 to-cyan-500': '#22D3EE',
          };

          levels.forEach((level) => {
            if (level.id) {
              const levelResult = levelResults[level.id] || {};
              const percentage = getRadarPercentageForLevel(levelResult);
              
              radarData[level.id] = {
                name: level.name,
                percentage: Math.min(100, Math.max(0, percentage))
              };

              // Obter cor baseada no nome do nível
              const levelColors = generateColorFromName(level.name);
              const hexColor = colorMap[levelColors.bg] || '#8B5CF6';
              
              radarMeta[level.id] = {
                name: level.name,
                color: hexColor
              };
            }
          });

          return (
            <div className="mt-8 space-y-6 sm:space-y-8">
              {/* Card de destaque - nível mais alto conquistado ou Nível 0 */}
              {singleLevelCardData && (
                <>
                  <div className="flex justify-center mb-6">
                    <div className="text-8xl select-none">
                      {singleLevelCardData.icon === 'stop' ? '🛑' : generateEmojiFromName(singleLevelCardData.title)}
                    </div>
                  </div>

                  <div className={`rounded-2xl p-5 sm:p-6 shadow-lg bg-gradient-to-br ${singleLevelCardData.cardBg} relative`}>
                    <p className="text-white font-bold text-xs uppercase tracking-widest mb-4">
                      {singleLevelCardData.label}
                    </p>

                    <div
                      className={`level-rich-content ProseMirror text-2xl sm:text-3xl leading-tight mb-6 ${TOKENS.fonts.serif}`}
                      dangerouslySetInnerHTML={{ __html: singleLevelCardData.title || '' }}
                    />

                    <div>
                      <div
                        ref={descriptionRef}
                        className={`level-rich-content ProseMirror text-base sm:text-lg ${
                          expandedLevelId === singleLevelCardData.levelId 
                            ? '' 
                            : isTruncated 
                              ? 'line-clamp-5 text-fade-out' 
                              : ''
                        }`}
                        dangerouslySetInnerHTML={{ __html: singleLevelCardData.description || '' }}
                      />
                      
                      {singleLevelCardData.description && isTruncated && expandedLevelId !== singleLevelCardData.levelId && (
                        <div className="mt-2 flex items-center justify-between gap-4">
                          <button
                            onClick={() => setExpandedLevelId(singleLevelCardData.levelId)}
                            className="text-white font-semibold text-base hover:opacity-90 transition-opacity flex items-center gap-1"
                          >
                            Ver mais <ChevronDown size={16} />
                          </button>
                          <button
                            onClick={() => openLevelAnswers(singleLevelCardData.levelId)}
                            className="text-white font-semibold text-base hover:opacity-90 transition-opacity"
                          >
                            Ver respostas
                          </button>
                        </div>
                      )}
                      
                      {expandedLevelId === singleLevelCardData.levelId && (
                        <div className="mt-3 flex items-center justify-between gap-4">
                          <button
                            onClick={() => setExpandedLevelId(null)}
                            className="text-white font-semibold text-base hover:opacity-90 transition-opacity flex items-center gap-1"
                          >
                            Ver menos <ChevronUp size={16} />
                          </button>
                          <button
                            onClick={() => openLevelAnswers(singleLevelCardData.levelId)}
                            className="text-white font-semibold text-base hover:opacity-90 transition-opacity"
                          >
                            Ver respostas
                          </button>
                        </div>
                      )}

                      {!singleLevelCardData.description && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => openLevelAnswers(singleLevelCardData.levelId)}
                            className="text-white font-semibold text-base hover:opacity-90 transition-opacity"
                          >
                            Ver respostas
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Radar Chart com Pontuações dos Níveis */}
              {Object.keys(radarData).length > 0 && (
                <div className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm sm:text-base font-bold text-[#1E1B4B] uppercase tracking-wide mb-6">Pontuação por Nível</h3>
                  <RadarChart 
                    indicatorResults={radarData}
                    indicatorMeta={radarMeta}
                    hideLegend={false}
                    defaultLegendOpen={false}
                    onItemClick={(levelId) => { document.getElementById(`level-card-${levelId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  />
                </div>
              )}

              {/* Cards de Níveis Não Alcançados */}
              {(() => {
                // Determinar nível de maior ordem
                const maxOrderLevel = levels.reduce((max, level) => 
                  level.display_order > (max?.display_order || -1) ? level : max
                , null);

                // Verificar se o nível de maior ordem foi alcançado
                const maxOrderAchieved = achievedLevels.some(al => al.level_id === maxOrderLevel?.id);

                // Obter IDs dos níveis alcançados
                const achievedLevelIds = achievedLevels.map(al => al.level_id);

                // Filtrar apenas níveis NÃO alcançados
                const unachivedLevelsList = levels
                  .filter(level => !achievedLevelIds.includes(level.id))
                  .sort((a, b) => a.display_order - b.display_order);

                // Não mostrar cards se o nível de maior ordem foi alcançado
                if (maxOrderAchieved || unachivedLevelsList.length === 0) {
                  return null;
                }

                return (
                  <>
                    <div className="mt-4">
                      <h3 className="text-base sm:text-lg font-bold text-[#1E1B4B] mb-4">
                        🎯 Veja como conquistar os demais níveis
                      </h3>
                    </div>

                    <div className="grid gap-4">
                      {unachivedLevelsList.map((level) => {
                        const levelResult = levelResults[level.id] || {};
                        const totalScore = (levelResult.levelScore || 0) + (levelResult.potentialScore || 0);
                        const targetScore = (level.acquire_threshold && level.acquire_threshold > 0)
                          ? Number(level.acquire_threshold)
                          : 100;

                        // Avanço do nível: pontuação total obtida em relação à pontuação de alcance
                        const progressPercentage = targetScore > 0
                          ? Math.min(100, Math.max(0, Math.round((totalScore / targetScore) * 100)))
                          : 0;
                        const remainingPercentage = Math.max(0, 100 - progressPercentage);
                        const potentialLabel = getPotentialLabelFromRemainingPercentage(remainingPercentage);
                        
                        const interpretation = getInterpretationForLevel(level.id, totalScore);
                        const levelColors = generateColorFromName(level.name);
                        const levelEmoji = generateEmojiFromName(level.name);
                        
                        // Extrair cor hex do gradiente
                        const hexColor = colorMap[levelColors.bg] || '#8B5CF6';
                        
                        return (
                          <div key={level.id} id={`level-card-${level.id}`} className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm">
                            {/* Layout Mobile */}
                            <div className="sm:hidden">
                              <div className="flex items-center gap-4 mb-3">
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center shadow text-2xl"
                                  style={{ backgroundColor: hexColor }}
                                >
                                  {levelEmoji}
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-[#1E1B4B]">{level.name}</h3>
                                </div>
                              </div>
                              
                              {/* Barra de progresso - Avanço */}
                              <div className="mb-3">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-medium text-gray-600">Avanço neste nível</span>
                                  <span className="text-xs font-bold text-[#1E1B4B]">{progressPercentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className="h-2.5 rounded-full transition-all duration-300"
                                    style={{ 
                                      width: `${progressPercentage}%`,
                                      backgroundColor: hexColor
                                    }}
                                  />
                                </div>
                              </div>

                              {potentialLabel && (
                                <p className="text-xs font-medium text-gray-600">
                                  Potencial de completar este nível é {potentialLabel}
                                </p>
                              )}
                            </div>

                            {/* Layout Desktop */}
                            <div className="hidden sm:block">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center shadow text-2xl"
                                    style={{ backgroundColor: hexColor }}
                                  >
                                    {levelEmoji}
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold text-[#1E1B4B]">{level.name}</h3>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Barra de progresso - Avanço */}
                              <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm font-medium text-gray-600">Avanço neste nível</span>
                                  <span className="text-sm font-bold text-[#1E1B4B]">{progressPercentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div
                                    className="h-3 rounded-full transition-all duration-300"
                                    style={{ 
                                      width: `${progressPercentage}%`,
                                      backgroundColor: hexColor
                                    }}
                                  />
                                </div>
                              </div>

                              {potentialLabel && (
                                <p className="text-sm font-medium text-gray-600 mb-4">
                                  Potencial de completar este nível é {potentialLabel}
                                </p>
                              )}
                            </div>

                            {/* Interpretação com truncamento */}
                            {interpretation && interpretation.interpretation && (
                              <div className="mt-4">
                                <div
                                  ref={el => interpretationRefs.current[level.id] = el}
                                  className={`level-rich-content-dark ProseMirror text-base sm:text-lg leading-relaxed text-justify [text-align-last:left] ${
                                    expandedInterpretations[level.id]
                                      ? '' 
                                      : truncatedInterpretations[level.id]
                                        ? 'line-clamp-5 text-fade-out' 
                                        : ''
                                  }`}
                                  dangerouslySetInnerHTML={{ __html: interpretation.interpretation || '' }}
                                />
                                
                                {/* "Ver mais" quando truncado e não expandido */}
                                <div className="mt-2 flex items-center justify-between gap-4">
                                  <div>
                                    {truncatedInterpretations[level.id] && !expandedInterpretations[level.id] && (
                                      <button
                                        onClick={() => toggleInterpretation(level.id)}
                                        className="text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity flex items-center gap-1"
                                      >
                                        Ver mais <ChevronDown size={16} />
                                      </button>
                                    )}

                                    {expandedInterpretations[level.id] && (
                                      <button
                                        onClick={() => toggleInterpretation(level.id)}
                                        className="text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity flex items-center gap-1"
                                      >
                                        Ver menos <ChevronUp size={16} />
                                      </button>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => openLevelAnswers(level.id)}
                                    className="text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity"
                                  >
                                    Ver respostas
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}

              {/* Mensagem quando não há dados */}
              {levels.length === 0 && (
                <div className="mt-8 flex flex-col items-center text-center gap-4 p-5 sm:p-6 bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl border-2 border-rose-200 shadow-md">
                  <div className="text-5xl sm:text-6xl">❌</div>
                  {noLevelAchievedTitle && (
                    <h3 className="text-xl sm:text-2xl font-bold text-rose-800">
                      {noLevelAchievedTitle}
                    </h3>
                  )}
                  {noLevelAchievedDescription && (
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed max-w-sm">
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
        })()
      }

      {/* MODO MULTI */}
      {levelMode === 'multi' && 
        (() => {
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

          if (allLevels.length > 0) {
            // Preparar dados para o radar chart
            const radarData = {};
            const radarMeta = {};
            
            // Mapa de cores para os níveis
            const colorMap = {
              // Cores específicas Bronze, Prata, Ouro, Platina
              'from-amber-700 to-orange-800': '#B45309',
              'from-gray-300 to-gray-500': '#9CA3AF',
              'from-yellow-400 to-yellow-600': '#FBBF24',
              'from-slate-300 to-blue-400': '#60A5FA',
              // Cores genéricas
              'from-yellow-400 to-yellow-500': '#FBBF24',
              'from-blue-400 to-blue-500': '#60A5FA',
              'from-purple-400 to-purple-500': '#A78BFA',
              'from-red-400 to-red-500': '#F87171',
              'from-green-400 to-green-500': '#4ADE80',
              'from-indigo-400 to-indigo-500': '#818CF8',
              'from-pink-400 to-pink-500': '#F472B6',
              'from-cyan-400 to-cyan-500': '#22D3EE',
            };

            allLevels.forEach((level) => {
              if (level.id) {
                const percentage = getRadarPercentageForLevel(level);
                
                radarData[level.id] = {
                  name: level.name,
                  percentage: Math.min(100, Math.max(0, percentage))
                };

                // Obter cor baseada no nome do nível
                const levelColors = generateColorFromName(level.name);
                const hexColor = colorMap[levelColors.bg] || '#8B5CF6';
                
                radarMeta[level.id] = {
                  name: level.name,
                  color: hexColor
                };
              }
            });

            return (
              <div className="mt-8 space-y-6 sm:space-y-8">
                {levelsSummary.count > 0 && (
                  <div className="bg-white/50 border border-white/60 rounded-xl p-4">
                    <p className="text-sm sm:text-base font-medium text-gray-700 leading-relaxed">
                      Veja a seguir os detalhes da sua pontuação descrita em{' '}
                      {levelsSummary.count} {levelsSummary.count === 1 ? 'nível' : 'níveis'}: {levelsSummary.namesText}.
                    </p>
                  </div>
                )}

                {/* Radar Chart com Pontuações dos Níveis */}
                <div className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm sm:text-base font-bold text-[#1E1B4B] uppercase tracking-wide mb-6">Pontuação por Nível</h3>
                  <RadarChart 
                    indicatorResults={radarData}
                    indicatorMeta={radarMeta}
                    hideLegend={false}
                    defaultLegendOpen={false}
                    onItemClick={(levelId) => { document.getElementById(`level-card-${levelId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  />
                </div>

                {/* Grid de Emblemas */}
                {showLevelBadges && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {allLevels.map((level) => (
                      <div
                        key={level.id}
                        onClick={() => level.isAchieved && handleLevelClick(level)}
                        className={level.isAchieved ? 'cursor-pointer' : 'cursor-default'}
                      >
                        <LevelBadgeAlternative
                          level={level}
                          isAchieved={level.isAchieved}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Cards de Níveis Não Alcançados */}
                {(() => {
                  // Determinar nível de maior ordem
                  const maxOrderLevel = levels.reduce((max, level) => 
                    level.display_order > (max?.display_order || -1) ? level : max
                  , null);

                  // Verificar se o nível de maior ordem foi alcançado
                  const maxOrderAchieved = achievedLevels.some(al => al.level_id === maxOrderLevel?.id);

                  // Obter IDs dos níveis alcançados
                  const achievedLevelIds = achievedLevels.map(al => al.level_id);

                  // Filtrar apenas níveis NÃO alcançados
                  const unachivedLevelsList = showLevelBadges
                    ? allLevels.filter(level => !level.isAchieved)
                    : allLevels;

                  // Com emblemas ativos, mantém regra atual. Sem emblemas, sempre mostra todos os cards.
                  if ((showLevelBadges && maxOrderAchieved) || unachivedLevelsList.length === 0) {
                    return null;
                  }

                  return (
                    <>
                      {showLevelBadges && (
                        <div className="mt-4">
                          <h3 className="text-base sm:text-lg font-bold text-[#1E1B4B] mb-4">
                            🎯 Veja como conquistar os demais níveis
                          </h3>
                        </div>
                      )}

                      <div className="grid gap-4">
                        {unachivedLevelsList.map((level) => {
                          const totalScore = (level.levelScore || 0) + (level.potentialScore || 0);
                          const targetScore = (level.acquire_threshold && level.acquire_threshold > 0)
                            ? Number(level.acquire_threshold)
                            : 100;

                          // Avanço do nível: pontuação total obtida em relação à pontuação de alcance
                          const progressPercentage = targetScore > 0
                            ? Math.min(100, Math.max(0, Math.round((totalScore / targetScore) * 100)))
                            : 0;
                          const remainingPercentage = Math.max(0, 100 - progressPercentage);
                          const potentialLabel = getPotentialLabelFromRemainingPercentage(remainingPercentage);
                          
                          const interpretation = getInterpretationForLevel(level.id, totalScore);
                          const colors = generateColorFromName(level.name);
                          const emoji = generateEmojiFromName(level.name);
                          
                          // Extrair cor hex do gradiente
                          const hexColor = colorMap[colors.bg] || '#8B5CF6';
                          
                          return (
                            <div key={level.id} id={`level-card-${level.id}`} className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm">
                              {/* Layout Mobile */}
                              <div className="sm:hidden">
                                <div className="flex items-center gap-4 mb-3">
                                  <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center shadow text-2xl"
                                    style={{ backgroundColor: hexColor }}
                                  >
                                    {emoji}
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-[#1E1B4B]">{level.name}</h3>
                                  </div>
                                </div>
                                
                                {/* Barra de progresso - Avanço */}
                                <div className="mb-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-medium text-gray-600">Avanço neste nível</span>
                                    <span className="text-xs font-bold text-[#1E1B4B]">{progressPercentage}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                      className="h-2.5 rounded-full transition-all duration-300"
                                      style={{ 
                                        width: `${progressPercentage}%`,
                                        backgroundColor: hexColor
                                      }}
                                    />
                                  </div>
                                </div>

                                {potentialLabel && (
                                  <p className="text-xs font-medium text-gray-600">
                                    Potencial de completar este nível é {potentialLabel}
                                  </p>
                                )}
                              </div>

                              {/* Layout Desktop */}
                              <div className="hidden sm:block">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-4">
                                    <div
                                      className="w-12 h-12 rounded-full flex items-center justify-center shadow text-2xl"
                                      style={{ backgroundColor: hexColor }}
                                    >
                                      {emoji}
                                    </div>
                                    <div>
                                      <h3 className="text-lg font-semibold text-[#1E1B4B]">{level.name}</h3>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Barra de progresso - Avanço */}
                                <div className="mb-4">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-600">Avanço neste nível</span>
                                    <span className="text-sm font-bold text-[#1E1B4B]">{progressPercentage}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                      className="h-3 rounded-full transition-all duration-300"
                                      style={{ 
                                        width: `${progressPercentage}%`,
                                        backgroundColor: hexColor
                                      }}
                                    />
                                  </div>
                                </div>

                                {potentialLabel && (
                                  <p className="text-sm font-medium text-gray-600 mb-4">
                                    Potencial de completar este nível é {potentialLabel}
                                  </p>
                                )}
                              </div>

                              {/* Interpretação com truncamento */}
                              {interpretation && interpretation.interpretation && (
                                <div className="mt-4">
                                  <div
                                    ref={el => interpretationRefs.current[level.id] = el}
                                    className={`level-rich-content-dark ProseMirror text-base sm:text-lg leading-relaxed text-justify [text-align-last:left] ${
                                      expandedInterpretations[level.id]
                                        ? '' 
                                        : truncatedInterpretations[level.id]
                                          ? 'line-clamp-5 text-fade-out' 
                                          : ''
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: interpretation.interpretation || '' }}
                                  />
                                  
                                  {/* "Ver mais" quando truncado e não expandido */}
                                  <div className="mt-2 flex items-center justify-between gap-4">
                                    <div>
                                      {truncatedInterpretations[level.id] && !expandedInterpretations[level.id] && (
                                        <button
                                          onClick={() => toggleInterpretation(level.id)}
                                          className="text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity flex items-center gap-1"
                                        >
                                          Ver mais <ChevronDown size={16} />
                                        </button>
                                      )}

                                      {expandedInterpretations[level.id] && (
                                        <button
                                          onClick={() => toggleInterpretation(level.id)}
                                          className="text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity flex items-center gap-1"
                                        >
                                          Ver menos <ChevronUp size={16} />
                                        </button>
                                      )}
                                    </div>

                                    <button
                                      onClick={() => openLevelAnswers(level.id)}
                                      className="text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity"
                                    >
                                      Ver respostas
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}

                <LevelDetailModal
                  isOpen={showLevelModal}
                  level={selectedLevel}
                  onClose={() => setShowLevelModal(false)}
                />
              </div>
            );
          }

          // Nenhum nível obtido
          return (
            <div className="mt-8 flex flex-col items-center text-center gap-4 p-5 sm:p-6 bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl border-2 border-rose-200 shadow-md">
              <div className="text-5xl sm:text-6xl">❌</div>
              {noLevelAchievedTitle && (
                <h3 className="text-lg sm:text-xl font-bold text-rose-800">
                  {noLevelAchievedTitle}
                </h3>
              )}
              {noLevelAchievedDescription && (
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed max-w-sm">
                  {noLevelAchievedDescription}
                </p>
              )}
            </div>
          );
        })()
      }

      <ItemResponsesModal
        isOpen={showLevelAnswersModal}
        onClose={() => setShowLevelAnswersModal(false)}
        title="Respostas por nível"
        itemLabel="Nível"
        items={levelModalItems}
        selectedKey={selectedLevelAnswersKey}
        onSelect={setSelectedLevelAnswersKey}
      />
    </>
  );
}
