import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Brain, Target, Award, ArrowRight } from 'lucide-react';
import { TOKENS } from '../config/tokens';
import { supabase } from '../supabaseClient';
import KahnemanAnalysisDisplay from './KahnemanAnalysisDisplay';
import ScenarioXPOverlay from './ScenarioXPOverlay';
import { calculateScenarioXP, getCurrentLevelProgress } from '../utils/gamificationUtils';
import { useProgressionUpdate } from '../hooks/useProgressionUpdate';

/**
 * Scenario Results Component
 * Exibe análise cognitiva e mapeamento para indicadores
 */
const ScenarioResults = ({ 
  analysis, 
  sessionMetadata,
  onClose,
  totalXP = 0,
  outcomeType = 'neutral'
}) => {
  const [showXPOverlay, setShowXPOverlay] = useState(false);
  const [xpData, setXpData] = useState(null);
  const [newTotalXP, setNewTotalXP] = useState(totalXP);
  const [xpAwarded, setXpAwarded] = useState(false);
  const { updateUserProgression } = useProgressionUpdate();

  // Calculate and PERSIST XP immediately on mount (BEFORE showing overlay)
  useEffect(() => {
    const awardXP = async () => {
      if (!analysis || !sessionMetadata || xpAwarded) return;

      try {
        // 1. Calculate XP based on cognitive analysis
        const xp = calculateScenarioXP(
          analysis.kahneman || {
            system1_score: 50,
            system2_score: 50,
            biases: []
          },
          sessionMetadata.avgDecisionTime || 0,
          sessionMetadata.decisionsCount || 0
        );
        setXpData(xp);

        // 2. IMMEDIATELY persist XP (before showing overlay)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          console.log('🎮 Persisting scenario XP immediately...', xp.totalXP);
          
          const progressResult = await updateUserProgression(
            user.id,
            0, // score (not used)
            0, // maxScore (not used)
            'scenario', // activityType
            xp.totalXP // Pre-calculated XP from calculateScenarioXP
          );
          
          if (progressResult.success) {
            console.log(`✅ Scenario XP persisted | +${progressResult.xpGained} XP`, progressResult);
            setXpAwarded(true);
            setNewTotalXP(progressResult.totalXP);
            
            // 3. ONLY AFTER persisting, show overlay
            setTimeout(() => setShowXPOverlay(true), 800);
          }
        }
      } catch (err) {
        console.error('Error persisting scenario XP:', err);
        // Even if XP fails, show overlay with calculated data
        setTimeout(() => setShowXPOverlay(true), 800);
      }
    };

    awardXP();
  }, [analysis, sessionMetadata, xpAwarded, updateUserProgression]);

  // Handle XP overlay close (XP already persisted)
  const handleCloseXPOverlay = () => {
    setShowXPOverlay(false);
    // XP was already persisted in useEffect above
    // This just closes the visual overlay
  };

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Análise não disponível</p>
      </div>
    );
  }

  const {
    patterns = {},
    indicators = {},
    insights = [],
    kahneman = null,
    kahnemanInsight = null
  } = analysis || {};

  const getInsightIcon = (type) => {
    switch (type) {
      case 'strength':
        return <Trophy className="w-5 h-5 text-green-600" />;
      case 'development':
        return <Target className="w-5 h-5 text-orange-600" />;
      case 'watch':
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
      default:
        return <Brain className="w-5 h-5 text-purple-600" />;
    }
  };

  const getInsightBgColor = (type) => {
    switch (type) {
      case 'strength':
        return 'bg-green-50 border-green-200';
      case 'development':
        return 'bg-orange-50 border-orange-200';
      case 'watch':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-purple-50 border-purple-200';
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}min ${secs}s`;
  };

  const getOutcomeLabel = (value) => {
    switch (value) {
      case 'success':
        return 'Desfecho: sucesso';
      case 'partial':
        return 'Desfecho: parcial';
      case 'failure':
        return 'Desfecho: insucesso';
      default:
        return 'Desfecho: em aprendizado';
    }
  };

  const getOutcomeDescription = (value) => {
    switch (value) {
      case 'success':
        return 'Sua trilha levou a um resultado positivo. Revise os pontos fortes para repetir esse padrão sob pressão.';
      case 'partial':
        return 'Você mitigou parte do problema, mas ainda houve perdas de eficácia. A aprendizagem está em identificar os pontos de alavancagem.';
      case 'failure':
        return 'Este desfecho mostra oportunidades claras de evolução. Erros aqui viram repertório para decisões melhores no próximo ciclo.';
      default:
        return 'Seu percurso trouxe sinais úteis para aprimorar decisões futuras.';
    }
  };

  const getWeakSpots = () => {
    const labels = {
      decision_speed: 'Velocidade de decisão',
      risk_profile: 'Gestão de risco',
      thinking_style: 'Estilo de pensamento',
      emotional_regulation: 'Regulação emocional',
      adaptability: 'Adaptabilidade',
      cognitive_load_management: 'Gestão de carga cognitiva',
      consistency: 'Consistência decisória'
    };

    return Object.entries(patterns || {})
      .filter(([, value]) => typeof value?.score === 'number' && value.score < 50)
      .sort((a, b) => a[1].score - b[1].score)
      .slice(0, 3)
      .map(([key, value]) => ({
        key,
        label: labels[key] || key,
        score: value.score,
        description: value.description || 'Sinal de melhoria identificado nesta trilha.'
      }));
  };

  const weakSpots = getWeakSpots();

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* XP Reward Overlay */}
      {xpData && (
        <ScenarioXPOverlay
          isVisible={showXPOverlay}
          xpData={xpData}
          totalXP={newTotalXP}
          onClose={handleCloseXPOverlay}
        />
      )}

      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#6366F1] mb-4">
          <Award className="w-8 h-8 text-white" />
        </div>
        <h2 className={`${TOKENS.fonts.serif} text-3xl sm:text-4xl text-[#1E1B4B] mb-2`}>
          Análise Completa
        </h2>
        <p className="text-gray-600">
          Sua jornada através do cenário revelou padrões cognitivos importantes
        </p>
      </div>

      {/* Session Metadata */}
      {sessionMetadata && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-4 justify-center">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tempo Total</p>
            <p className="text-lg font-bold text-gray-800">{formatTime(sessionMetadata.totalTime)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Decisões</p>
            <p className="text-lg font-bold text-gray-800">{sessionMetadata.decisionsCount}</p>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-[#EEF2FF] to-[#F8FAFC] border border-[#C7D2FE] rounded-xl p-4">
        <p className="text-sm font-semibold text-[#312E81] mb-1">
          {getOutcomeLabel(outcomeType)}
        </p>
        <p className="text-sm text-gray-700">
          {getOutcomeDescription(outcomeType)}
        </p>
      </div>

      {(outcomeType === 'partial' || outcomeType === 'failure') && weakSpots.length > 0 && (
        <div className="bg-[#FFF7ED] border border-[#FED7AA] rounded-xl p-5 space-y-3">
          <h3 className="text-base font-bold text-[#9A3412]">
            Onde a trilha perdeu eficacia
          </h3>
          {weakSpots.map((spot) => (
            <div key={spot.key} className="bg-white rounded-lg border border-[#FDBA74] p-3">
              <p className="text-sm font-semibold text-[#7C2D12]">
                {spot.label} - {spot.score}/100
              </p>
              <p className="text-sm text-[#7C2D12]/90 mt-1">
                {spot.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Kahneman Analysis (Primary Framework) */}
      {kahneman && kahnemanInsight && (
        <KahnemanAnalysisDisplay 
          kahnemanData={kahneman}
          kahnemanInsight={kahnemanInsight}
        />
      )}

      {/* Insights */}
      {insights && insights.length > 0 && (
        <div className="space-y-4">
          <h3 className={`${TOKENS.fonts.serif} text-2xl text-[#1E1B4B]`}>
            Principais Insights
          </h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`border rounded-xl p-4 ${getInsightBgColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cognitive Patterns */}
      <div className="space-y-4">
        <h3 className={`${TOKENS.fonts.serif} text-2xl text-[#1E1B4B]`}>
          Padrões Cognitivos Identificados
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Decision Speed */}
          {patterns.decision_speed && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">Velocidade de Decisão</h4>
                <span className="text-2xl font-bold text-[#4F46E5]">{patterns.decision_speed.score}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{patterns.decision_speed.description}</p>
              <div className="text-xs text-gray-500">
                Média: {patterns.decision_speed.avgTime}s
              </div>
            </div>
          )}

          {/* Risk Profile */}
          {patterns.risk_profile && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">Perfil de Risco</h4>
                <span className="text-2xl font-bold text-[#4F46E5]">{patterns.risk_profile.score}</span>
              </div>
              <p className="text-sm text-gray-600">{patterns.risk_profile.description}</p>
            </div>
          )}

          {/* Emotional Regulation */}
          {patterns.emotional_regulation && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">Regulação Emocional</h4>
                <span className="text-2xl font-bold text-[#4F46E5]">{patterns.emotional_regulation.score}</span>
              </div>
              <p className="text-sm text-gray-600">{patterns.emotional_regulation.description}</p>
            </div>
          )}

          {/* Adaptability */}
          {patterns.adaptability && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">Adaptabilidade</h4>
                <span className="text-2xl font-bold text-[#4F46E5]">{patterns.adaptability.score}</span>
              </div>
              <p className="text-sm text-gray-600">{patterns.adaptability.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Indicator Mapping */}
      {indicators && Object.keys(indicators).length > 0 && (
        <div className="space-y-4">
          <h3 className={`${TOKENS.fonts.serif} text-2xl text-[#1E1B4B]`}>
            Impacto nos Seus Indicadores
          </h3>
          <div className="bg-gradient-to-br from-[#EDE9FF] to-[#F8F7FF] border border-[#4F46E5]/30 rounded-2xl p-6">
            <div className="space-y-4">
              {Object.entries(indicators).map(([name, data]) => (
                <div key={name} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-900">{name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-[#4F46E5]">{data.score}</span>
                      <span className="text-sm text-gray-500">/100</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-gradient-to-r from-[#4F46E5] to-[#6366F1] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${data.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    {data.evidence}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-600 text-center">
            Seus indicadores foram atualizados com base nesta experiência
          </p>
        </div>
      )}

      {/* Close Button */}
      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={onClose}
          className="group inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 shadow-xl"
        >
          Voltar para Atividades
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default ScenarioResults;
