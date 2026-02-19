import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2, ArrowRight, Zap, Check, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import RadarChart from '../components/charts/RadarChart';
import HorizontalBarChart from '../components/charts/HorizontalBarChart';
import XPGainOverlay from '../components/XPGainOverlay';
import { useProgressionUpdate } from '../hooks/useProgressionUpdate';
import { TOKENS } from '../config/tokens';
import { getLucideIcon } from '../utils/iconUtils';
import { XP_CONFIG, calculateXP, formatXP } from '../utils/gamificationUtils';

// Fallback functions quando não há ranges configuradas
function classifyFallback(percentage) {
  if (percentage <= 40) return 'Crítico';
  if (percentage <= 70) return 'Moderado';
  return 'Saudável';
}

const generateInterpretationFallback = (name, percentage) => {
  if (percentage <= 40)
    return `O indicador ${name} apresenta nível crítico e requer atenção imediata.`;
  if (percentage <= 70)
    return `O indicador ${name} apresenta nível moderado, com oportunidades claras de melhoria.`;
  return `O indicador ${name} apresenta nível saudável e consistente.`;
};

// Função para classificar com base nas ranges do banco
const getClassificationFromRanges = (score, maxScore, ranges, indicatorName) => {
  if (!ranges || ranges.length === 0) {
    // Fallback se não houver ranges configuradas
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return {
      percentage,
      classification: classifyFallback(percentage),
      interpretation: generateInterpretationFallback(indicatorName, percentage)
    };
  }

  // Ordenar ranges por min_score
  const sortedRanges = [...ranges].sort((a, b) => a.min_score - b.min_score);
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  console.log(`� DEBUG getClassificationFromRanges:`, {
    indicatorName,
    score,
    maxScore,
    percentage,
    ranges: sortedRanges
  });

  // Encontrar a faixa que contém o score baseado na PERCENTAGE, não no score bruto
  for (let i = 0; i < sortedRanges.length; i++) {
    const range = sortedRanges[i];
    const inRange = percentage >= range.min_score && percentage <= range.max_score;
    
    console.log(`  Testando range "${range.label}" (${range.min_score}-${range.max_score}): ${percentage} >= ${range.min_score} && ${percentage} <= ${range.max_score} = ${inRange}`);
    
    if (inRange) {
      console.log(`✅ Enquadrado em: ${range.label}`);
      return {
        percentage,
        classification: range.label,
        interpretation: range.interpretation || ''
      };
    }
  }

  // Se não encontrar faixa, usar a última
  const lastRange = sortedRanges[sortedRanges.length - 1];
  return {
    percentage,
    classification: lastRange.label,
    interpretation: lastRange.interpretation || ''
  };
};

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateUserProgression } = useProgressionUpdate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [assessmentRanges, setAssessmentRanges] = useState({});
  const [assessmentData, setAssessmentData] = useState(null);
  const [indicatorsMeta, setIndicatorsMeta] = useState({});
  const [overallRanges, setOverallRanges] = useState([]);
  const [suggestedAssessments, setSuggestedAssessments] = useState([]);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [showXPOverlay, setShowXPOverlay] = useState(false);
  const [xpOverlayData, setXpOverlayData] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchResult = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) setError('Usuário não autenticado.');
          return;
        }

        let query = supabase
          .from('assessment_events')
          .select(`
            *,
            assessment_versions!assessment_events_assessment_version_id_fkey (
              id,
              version_number,
              is_active,
              created_at,
              assessment_id,
              visualization_type
            )
          `);

        // If id provided, fetch specific record; otherwise fetch last for current user
        if (id) {
          query = query.eq('id', id);
        } else {
          query = query.eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
        }

        const { data, error } = await query.single();

        if (error) {
          const msg = String(error.message || error);
          if (/0 rows|No rows|Results contain 0/i.test(msg)) {
            if (mounted) setResult(null);
          } else {
            throw error;
          }
        } else {
          if (mounted) setResult(data);

          // Verificar se XP já foi concedido anteriormente
          const isFirstVisit = data.xp_awarded === false || data.xp_awarded === null;
          
          // Atualizar progressão do usuário apenas na primeira visita
          if (isFirstVisit) {
            try {
              if (data?.total_score !== undefined && data?.max_possible_score !== undefined) {
                console.log('🎮 Primeira visita detectada - Iniciando atualização de progressão...');
                const activityType = data.activity_type || 'assessment';
                const progressResult = await updateUserProgression(
                  user.id,
                  data.total_score,
                  data.max_possible_score,
                  activityType
                );
                
                console.log('🎮 Resultado da progressão:', progressResult);
                
                if (progressResult.success) {
                  console.log(`✅ Progressão atualizada | +${progressResult.xpGained} XP`, progressResult);
                  
                  // Marcar XP como concedido
                  await supabase
                    .from('assessment_events')
                    .update({ xp_awarded: true })
                    .eq('id', data.id);
                  
                  // Preparar dados do overlay XP
                  const bonuses = [];
                  const xpGained = progressResult.xpGained || 0;
                  
                  // Calcular bônus alcançados
                  const xpConfig = XP_CONFIG[activityType] || XP_CONFIG.assessment;
                  const percentage = data.max_possible_score > 0 ? Math.round((data.total_score / data.max_possible_score) * 100) : 0;
                  
                  if (percentage >= 100 && xpConfig.bonusThresholds?.[100]) {
                    bonuses.push({
                      label: 'Resultado 100%',
                      xp: xpConfig.bonusThresholds[100]
                    });
                  } else if (percentage >= 90 && xpConfig.bonusThresholds?.[90]) {
                    bonuses.push({
                      label: 'Resultado 90%+',
                      xp: xpConfig.bonusThresholds[90]
                    });
                  } else if (percentage >= 80 && xpConfig.bonusThresholds?.[80]) {
                    bonuses.push({
                      label: 'Resultado 80%+',
                      xp: xpConfig.bonusThresholds[80]
                    });
                  }
                  
                  if (mounted) {
                    setXpOverlayData({
                      xpGained,
                      totalXP: progressResult.totalXP,
                      newLevel: progressResult.newLevel,
                      leveledUp: progressResult.leveledUp,
                      bonuses
                    });
                    setShowXPOverlay(true);
                  }
                  
                  if (progressResult.leveledUp) {
                    console.log(`🎉 Level Up! Agora no nível ${progressResult.newLevel}`);
                  }
                } else {
                  console.warn('⚠️ Erro ao atualizar progressão:', progressResult.error);
                }
              } else {
                console.warn('⚠️ Dados de score não encontrados em assessment_events:', { total_score: data?.total_score, max_possible_score: data?.max_possible_score });
              }
            } catch (progressError) {
            console.error('❌ Erro crítico ao atualizar progressão:', progressError);
          }
          } else {
            console.log('ℹ️ XP já foi concedido anteriormente para este resultado. Overlay não será exibido.');
          }

          // Usar visualization_type da versão específica do assessment
          if (data?.assessment_versions) {
            // Normalizar visualization_type para array
            let visualizationType = data.assessment_versions.visualization_type;
            
            if (visualizationType) {
              if (typeof visualizationType === 'string') {
                // Se for string, pode ser JSON string ou valor único
                try {
                  const parsed = JSON.parse(visualizationType);
                  visualizationType = Array.isArray(parsed) ? parsed : [parsed];
                } catch {
                  // Não é JSON, tratar como string simples
                  visualizationType = [visualizationType];
                }
              } else if (!Array.isArray(visualizationType)) {
                // Se for objeto ou outro tipo, tentar converter
                visualizationType = [visualizationType];
              }
            } else {
              // Fallback para radar se não especificado
              visualizationType = ['radar'];
            }
            
            // Buscar dados do assessment (nome e descrição)
            const { data: assessmentInfo, error: assessmentError } = await supabase
              .from('assessments')
              .select('name, description')
              .eq('id', data.assessment_versions.assessment_id)
              .single();
            
            if (mounted) {
              setAssessmentData({
                ...data.assessment_versions,
                name: assessmentInfo?.name || 'Assessment',
                description: assessmentInfo?.description || '',
                visualization_type: visualizationType
              });
            }

            // Buscar as ranges e metadados dos indicadores
            const { data: indicatorsData, error: indError } = await supabase
              .from('assessment_indicators')
              .select(`
                id,
                indicator_master_id,
                indicators_master (
                  id,
                  name,
                  description,
                  color,
                  icon
                ),
                assessment_indicator_ranges (
                  min_score,
                  max_score,
                  label,
                  interpretation
                )
              `)
              .eq('assessment_version_id', data.assessment_version_id)
              .order('display_order', { ascending: true });

            if (!indError && indicatorsData) {
              // Buscar conceptual_description dos indicators
              const { data: fullIndicators, error: fullIndError } = await supabase
                .from('indicators')
                .select('id, indicator_master_id, name, conceptual_description')
                .eq('assessment_id', data.assessment_versions.assessment_id);

              console.log('📊 DEBUG Results: fullIndicators carregados:', fullIndicators);

              // Criar múltiplos índices para garantir match
              const conceptualDescByMasterId = {};
              const conceptualDescByName = {};
              if (!fullIndError && fullIndicators) {
                fullIndicators.forEach(ind => {
                  const desc = ind.conceptual_description || '';
                  // Índice por indicator_master_id
                  if (ind.indicator_master_id) {
                    conceptualDescByMasterId[ind.indicator_master_id] = desc;
                  }
                  // Índice por name (fallback)
                  if (ind.name) {
                    conceptualDescByName[ind.name] = desc;
                  }
                  console.log(`  - Indicador "${ind.name}": master_id=${ind.indicator_master_id}, desc="${desc.substring(0, 50)}..."`);
                });
              }

              // Mapear ranges por id do indicador e por nome (compatibilidade)
              const rangesMap = {};
              const metaMap = {};
              console.log('🔍 DEBUG Results: Indicadores com ranges (indicatorsData):', indicatorsData);
              indicatorsData.forEach(ind => {
                const indicatorName = ind.indicators_master?.name;
                const indicatorMasterId = ind.indicator_master_id;
                const masterDescription = ind.indicators_master?.description || '';
                
                console.log(`\n  Processando: "${indicatorName}" (master_id: ${indicatorMasterId})`);
                console.log(`    Master description: "${masterDescription.substring(0, 50)}..."`);
                
                if (indicatorMasterId || indicatorName) {
                  if (ind.assessment_indicator_ranges) {
                    const sortedRanges = ind.assessment_indicator_ranges.sort(
                      (a, b) => a.min_score - b.min_score
                    );
                    if (indicatorMasterId) {
                      rangesMap[indicatorMasterId] = sortedRanges;
                    }
                    if (indicatorName) {
                      rangesMap[indicatorName] = sortedRanges;
                    }
                  }
                  
                  // FALLBACK CASCATEADO:
                  // 1. Tentar conceptual_description de indicators (customização)
                  // 2. Se vazio, usar description de indicators_master (padrão)
                  let conceptualDesc = '';
                  
                  if (indicatorMasterId && conceptualDescByMasterId[indicatorMasterId]) {
                    conceptualDesc = conceptualDescByMasterId[indicatorMasterId];
                    console.log(`    ✅ Usando conceptual_description: "${conceptualDesc.substring(0, 50)}..."`);
                  } else if (masterDescription) {
                    conceptualDesc = masterDescription;
                    console.log(`    ✅ FALLBACK para master description: "${conceptualDesc.substring(0, 50)}..."`);
                  } else if (conceptualDescByName[indicatorName]) {
                    conceptualDesc = conceptualDescByName[indicatorName];
                    console.log(`    ✅ Match por name: "${conceptualDesc.substring(0, 50)}..."`);
                  } else {
                    console.log(`    ❌ NENHUMA descrição encontrada!`);
                  }
                  
                  const metaPayload = {
                    id: indicatorMasterId,
                    name: indicatorName,
                    color: ind.indicators_master?.color || '#6366F1',
                    icon: ind.indicators_master?.icon || 'circle',
                    conceptual_description: conceptualDesc
                  };
                  if (indicatorMasterId) {
                    metaMap[indicatorMasterId] = metaPayload;
                  }
                  if (indicatorName) {
                    metaMap[indicatorName] = metaPayload;
                  }
                }
              });
              
              console.log('📊 DEBUG Results: metaMap final:', metaMap);
              if (mounted) {
                setAssessmentRanges(rangesMap);
                setIndicatorsMeta(metaMap);
              }
            }

            // Buscar overall_ranges para interpretação do resultado geral
            const { data: overallRangesData, error: overallError } = await supabase
              .from('assessment_overall_ranges')
              .select('*')
              .eq('assessment_version_id', data.assessment_version_id)
              .order('min_score', { ascending: true });

            if (!overallError && overallRangesData) {
              console.log('📊 DEBUG Results: Overall ranges carregados:', overallRangesData);
              if (mounted) setOverallRanges(overallRangesData);
            } else if (overallError) {
              console.warn('⚠️ Aviso ao carregar overall_ranges:', overallError);
            }
          }
        }
      } catch (err) {
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchResult();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    const fetchSuggested = async () => {
      const currentAssessmentId = assessmentData?.id || result?.assessment_versions?.assessment_id;
      if (!currentAssessmentId) return;

      setSuggestedLoading(true);
      try {
        const { data } = await supabase
          .from('assessments')
          .select('id, name, description, is_active, published_at, created_at')
          .eq('is_active', true);

        const sorted = (data || [])
          .filter(item => item?.id !== currentAssessmentId)
          .sort((a, b) => {
            const dateA = new Date(a.published_at || a.created_at || 0).getTime();
            const dateB = new Date(b.published_at || b.created_at || 0).getTime();
            return dateB - dateA;
          });

        setSuggestedAssessments(sorted.slice(0, 3));
      } finally {
        setSuggestedLoading(false);
      }
    };

    fetchSuggested();
  }, [assessmentData?.id, result?.assessment_versions?.assessment_id]);

  if (loading) return <div className="p-12 text-center">Carregando...</div>;
  if (error) return <div className="p-12 text-center text-red-600">{error}</div>;
  if (!result) return <div className="p-12 text-center">Nenhum assessment encontrado.</div>;

  console.log('📊 DEBUG Results: Dados do resultado:', result);
  console.log('📊 DEBUG Results: Classification Snapshot:', result.classification_snapshot);
  console.log('📊 DEBUG Results: Indicator Scores:', result.indicator_scores_snapshot);

  const total = result.total_score ?? 0;
  const max = result.max_possible_score ?? 0;
  const percentage = max > 0 ? Math.round((total / max) * 100) : 0;
  
  // Calcular interpretação geral usar as overall_ranges
  let overallInterpretation = '';
  let overallLabel = classifyFallback(percentage);
  if (overallRanges.length > 0) {
    const range = overallRanges.find(r => percentage >= r.min_score && percentage <= r.max_score);
    if (range) {
      overallLabel = range.label;
      overallInterpretation = range.interpretation || '';
    }
  }
  
  const classification = overallLabel;

  const assessmentName = assessmentData?.name || result?.assessment_versions?.assessment_id || 'Assessment';
  const assessmentDescription = assessmentData?.description || '';

  const activityType = result.activity_type || 'assessment';
  const xpConfig = XP_CONFIG[activityType] || XP_CONFIG.assessment;
  const totalXp = calculateXP(total, max, activityType);
  const bonusXp = Math.max(0, totalXp - xpConfig.base);
  const bonus80 = xpConfig.bonusThresholds?.[80] ?? 0;
  const bonus90 = xpConfig.bonusThresholds?.[90] ?? 0;
  const bonus100 = xpConfig.bonusThresholds?.[100] ?? 0;
  const reached80 = percentage >= 80;
  const reached90 = percentage >= 90;
  const reached100 = percentage >= 100;

  let bonusLabel = 'Sem bônus obtido';
  if (bonusXp > 0) {
    if (percentage >= 100) bonusLabel = 'Bônus máximo (100%)';
    else if (percentage >= 90) bonusLabel = 'Bônus alto (90%+)';
    else if (percentage >= 80) bonusLabel = 'Bônus (80%+)';
  }

  const getClassificationTone = (label) => {
    if (label === 'Crítico') return 'bg-red-100 text-red-700';
    if (label === 'Moderado') return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getIndicatorBadgeStyle = (value) => {
    const clamped = Math.min(100, Math.max(0, Number(value) || 0));
    const t = clamped / 100;
    const red = { r: 220, g: 38, b: 38 };
    const blue = { r: 59, g: 130, b: 246 };
    const green = { r: 22, g: 163, b: 74 };

    const blend = (from, to, amount) => ({
      r: Math.round(from.r + (to.r - from.r) * amount),
      g: Math.round(from.g + (to.g - from.g) * amount),
      b: Math.round(from.b + (to.b - from.b) * amount)
    });

    const blended = t <= 0.5
      ? blend(red, blue, t * 2)
      : blend(blue, green, (t - 0.5) * 2);

    return {
      backgroundColor: `rgb(${blended.r}, ${blended.g}, ${blended.b})`,
      color: '#FFFFFF',
      boxShadow: `0 0 12px rgba(${blended.r}, ${blended.g}, ${blended.b}, 0.35)`
    };
  };

  const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));

  let indicatorScores = result.indicator_scores_snapshot || {};
  if (typeof indicatorScores === 'string') {
    try { indicatorScores = JSON.parse(indicatorScores); } catch (e) { indicatorScores = {}; }
  }

  // classification snapshot may contain detailed per-indicator results
  let classificationSnapshot = result.classification_snapshot || null;
  if (typeof classificationSnapshot === 'string') {
    try { classificationSnapshot = JSON.parse(classificationSnapshot); } catch (e) { classificationSnapshot = null; }
  }

  // Build indicator results: prefer snapshot (dados no momento da resposta), otherwise fallback to calculation with DB ranges
  const indicatorResults = classificationSnapshot || (() => {
    const out = {};
    const totalOverall = Object.values(indicatorScores).reduce((s, v) => {
      const scoreValue = Number(v?.score ?? v ?? 0);
      return s + scoreValue;
    }, 0);
    Object.entries(indicatorScores).forEach(([k, v]) => {
      const score = Number(v?.score ?? v ?? 0);
      const providedMax = Number(v?.maxScore ?? v?.max_score ?? 0);
      const computedMax = max > 0 && totalOverall > 0 ? Math.round((score / Math.max(1, totalOverall)) * max) : 0;
      const maxForIndicator = providedMax || computedMax;
      
      // Usar ranges do banco de dados para classificação
      const ranges = assessmentRanges[k] || assessmentRanges[v?.indicator_id] || assessmentRanges[v?.name] || [];
      const indicatorLabel = v?.name || k;
      const classificationData = getClassificationFromRanges(score, maxForIndicator, ranges, indicatorLabel);
      console.log(`📊 DEBUG Results - ${k}: Score ${score}/${maxForIndicator}, Ranges:`, ranges, 'Classificação:', classificationData);
      
      out[k] = {
        indicator_id: v?.indicator_id || (isUuid(k) ? k : null),
        name: v?.name || indicatorLabel,
        score,
        maxScore: maxForIndicator,
        percentage: classificationData.percentage,
        classification: classificationData.classification,
        interpretation: classificationData.interpretation
      };
    });
    return out;
  })();

  const resolveMeta = (key, value) => {
    if (indicatorsMeta[key]) return indicatorsMeta[key];
    if (value?.indicator_id && indicatorsMeta[value.indicator_id]) return indicatorsMeta[value.indicator_id];
    if (value?.name && indicatorsMeta[value.name]) return indicatorsMeta[value.name];
    return {};
  };

  const resolveName = (key, value) => {
    const meta = resolveMeta(key, value);
    return value?.name || meta?.name || key;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF]">
      {/* XP Gain Overlay */}
      {xpOverlayData && (
        <XPGainOverlay
          isVisible={showXPOverlay}
          xpGained={xpOverlayData.xpGained}
          totalXP={xpOverlayData.totalXP}
          newLevel={xpOverlayData.newLevel}
          leveledUp={xpOverlayData.leveledUp}
          bonuses={xpOverlayData.bonuses}
          onClose={() => setShowXPOverlay(false)}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 pt-8">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-white bg-gradient-to-r from-[#4F46E5] to-[#6366F1] px-4 py-2 rounded-full mb-6 shadow-md">
            Assessment
          </span>
          <h1 className={`${TOKENS.fonts.serif} font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1E1B4B] mb-4 leading-tight`}>
            {assessmentName}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {assessmentDescription}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
          {/* Coluna principal - rola normalmente */}
          <div>
            <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-start justify-between gap-6">
                <div className="text-center md:text-left">
                  <p className="text-[#4F46E5] font-bold text-xs uppercase tracking-widest mb-1">
                    Resultado do assessment
                  </p>
                  <h3 className="text-4xl sm:text-5xl font-black text-[#1E1B4B] pt-2">
                    {classification}
                  </h3>
                </div>
              </div>

              <div className="mt-8">
                <div className="relative w-full">
                  <div className="w-full bg-[#E0E7FF] h-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div
                    className="absolute top-1/2 w-9 h-9 rounded-full shadow-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-[#4F46E5] to-[#6366F1]"
                    style={{ left: `${percentage}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    {percentage}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>
              <p className="mt-6 text-base sm:text-lg text-gray-700 leading-relaxed text-justify [text-align-last:left]">
              {overallInterpretation || 'Este resultado reflete seu desempenho geral no assessment.'}
            </p>
            </div>

            {assessmentData && Array.isArray(assessmentData.visualization_type) && assessmentData.visualization_type.length > 0 && (
              <div className="mt-8 grid gap-6">
                {/* Se ambos os gráficos estão selecionados, renderizar no mesmo card */}
                {assessmentData.visualization_type.includes('radar') && assessmentData.visualization_type.includes('horizontal-bar') ? (
                  <div className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm space-y-8">
                    <RadarChart indicatorResults={indicatorResults} indicatorMeta={indicatorsMeta} hideLegend={true} />
                    <div className="border-t border-gray-200 pt-6">
                      <HorizontalBarChart indicatorResults={indicatorResults} indicatorMeta={indicatorsMeta} />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Renderizar gráficos individualmente */}
                    {assessmentData.visualization_type.includes('radar') && (
                      <div className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm">
                        <RadarChart indicatorResults={indicatorResults} indicatorMeta={indicatorsMeta} />
                      </div>
                    )}
                    {assessmentData.visualization_type.includes('horizontal-bar') && (
                      <div className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm">
                        <HorizontalBarChart indicatorResults={indicatorResults} indicatorMeta={indicatorsMeta} />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="mt-8 grid gap-4">
              {Object.entries(indicatorResults)
                .sort(([, a], [, b]) => (b?.percentage ?? 0) - (a?.percentage ?? 0))
                .map(([k, v]) => {
                const meta = resolveMeta(k, v);
                const displayName = resolveName(k, v);
                const IndicatorIcon = meta?.icon ? getLucideIcon(meta.icon) : null;

                return (
                  <div key={k} className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center shadow"
                          style={{ backgroundColor: meta.color || '#6366F1' }}
                        >
                          {IndicatorIcon ? (
                            <IndicatorIcon className="w-6 h-6 text-white" strokeWidth={2} />
                          ) : (
                            <span className="text-white text-sm font-bold">●</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-[#1E1B4B]">{displayName}</h3>
                        </div>
                      </div>
                      <div className="flex flex-col items-end text-right">
                        <span
                          className="inline-flex px-3 py-1 text-xs font-bold rounded-full uppercase"
                          style={getIndicatorBadgeStyle(v.percentage)}
                        >
                          {v.classification}
                        </span>
                        <p className="text-2xl font-semibold text-[#1E1B4B] mt-2">{v.percentage}%</p>
                      </div>
                    </div>

                    {v.interpretation && (
                      <p className="mt-3 text-base text-gray-700 leading-relaxed text-justify [text-align-last:left]">
                        {v.interpretation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card XP - sticky (apenas desktop) */}
          <div 
            className="hidden lg:block bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/60 rounded-2xl p-6 sm:p-8 shadow-lg self-start overflow-hidden"
            style={{
              position: 'sticky',
              top: '5rem'
            }}
          >
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


          {/* Versão mobile do card mt-8 de XP */}
          <div className="lg:hidden">
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200/60 rounded-2xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 rounded-full blur-2xl"></div>
              <div className="relative z-10">
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
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className={`${TOKENS.fonts.serif} text-2xl text-[#1E1B4B]`}>Atividades a seguir</h2>
            <button
              type="button"
              onClick={() => navigate('/activities')}
              className="text-sm font-semibold text-[#4F46E5] hover:underline"
            >
              Ver todas
            </button>
          </div>
          {suggestedLoading ? (
            <div className="bg-white/80 border border-white/60 rounded-2xl p-6 text-sm text-gray-600">
              Carregando sugestoes...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {suggestedAssessments.length === 0 ? (
                <div className="bg-white/80 border border-white/60 rounded-2xl p-6 text-sm text-gray-600">
                  Nenhuma sugestao encontrada agora.
                </div>
              ) : (
                suggestedAssessments.map(assessment => (
                  <button
                    key={assessment.id}
                    type="button"
                    onClick={() => navigate(`/assessment/${assessment.id}`)}
                    className="group bg-white/80 border border-white/60 rounded-2xl p-6 text-left shadow-sm hover:shadow-lg transition"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4F46E5] mb-2">Disponivel</p>
                    <h3 className={`${TOKENS.fonts.serif} text-xl text-[#1E1B4B] mb-3 leading-tight`}>
                      {assessment.name}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      {assessment.description}
                    </p>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#4F46E5]">
                      Iniciar agora <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
