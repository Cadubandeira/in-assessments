import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2, ArrowRight, ToolCase, Zap, Check, X, Download } from 'lucide-react';
import XPRewardWidget from '../components/XPRewardWidget';
import CallToActionCardLong from '../components/CallToActionCardLong';
import { supabase } from '../supabaseClient';
import RadarChart from '../components/charts/RadarChart';
import HorizontalBarChart from '../components/charts/HorizontalBarChart';
import ScenarioXPOverlay from '../components/ScenarioXPOverlay';
import { TOKENS } from '../config/tokens';
import { getLucideIcon } from '../utils/iconUtils';
import { XP_CONFIG, calculateXP, formatXP } from '../utils/gamificationUtils';
import ResultsSkeleton from '../components/skeletons/ResultsSkeleton';

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


  // Encontrar a faixa que contém o score baseado na PERCENTAGE, não no score bruto
  for (let i = 0; i < sortedRanges.length; i++) {
    const range = sortedRanges[i];
    const inRange = percentage >= range.min_score && percentage <= range.max_score;
    
    if (inRange) {
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

export default function PublicResults() {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [newTotalXP, setNewTotalXP] = useState(0);

  useEffect(() => {
    // Removido: let mounted = true; (não necessário para página pública)
    const fetchResult = async () => {
      setLoading(true);
      try {
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
              visualization_type,
              final_reflection
            )
          `);

        if (id) {
          query = query.eq('id', id);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            setError('Usuário não autenticado. Faça login para ver seu último resultado.');
            setLoading(false);
            return;
          }
          query = query.eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
        }

        const { data, error } = await query.single();

        if (error) {
          const msg = String(error.message || error);
          if (/0 rows|No rows|Results contain 0/i.test(msg)) {
            setResult(null);
          } else {
            throw error;
          }
        } else {
          setResult(data);
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
            
            setAssessmentData({
              ...data.assessment_versions,
              name: assessmentInfo?.name || 'Assessment',
              description: assessmentInfo?.description || '',
              visualization_type: visualizationType,
              final_reflection: data.assessment_versions?.final_reflection || ''
            });

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
                });
              }

              // Mapear ranges por id do indicador e por nome (compatibilidade)
              const rangesMap = {};
              const metaMap = {};
              indicatorsData.forEach(ind => {
                const indicatorName = ind.indicators_master?.name;
                const indicatorMasterId = ind.indicator_master_id;
                const masterDescription = ind.indicators_master?.description || '';
                
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
                  } else if (masterDescription) {
                    conceptualDesc = masterDescription;
                  } else if (conceptualDescByName[indicatorName]) {
                    conceptualDesc = conceptualDescByName[indicatorName];
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
              
              setAssessmentRanges(rangesMap);
              setIndicatorsMeta(metaMap);
            }

            // Buscar overall_ranges para interpretação do resultado geral
            const { data: overallRangesData, error: overallError } = await supabase
              .from('assessment_overall_ranges')
              .select('*')
              .eq('assessment_version_id', data.assessment_version_id)
              .order('min_score', { ascending: true });

            if (!overallError && overallRangesData) {
              setOverallRanges(overallRangesData);
            } else if (overallError) {
              console.warn('⚠️ Aviso ao carregar overall_ranges:', overallError);
            }
          }
        }
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
    return () => {};
  }, [id]);

  useEffect(() => {
    // Só buscar sugestões se não estivermos vendo um resultado público específico
    if (id) return;

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

  if (loading) return <ResultsSkeleton />;
  if (error) return <div className="p-12 text-center text-red-600">{error}</div>;
  if (!result) return <div className="p-12 text-center">Nenhum assessment encontrado.</div>;

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
  const finalReflectionText = assessmentData?.final_reflection || result?.assessment_versions?.final_reflection || '';

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
      {/* XP Overlay - Mesmo componente do Assessment */}
      {xpOverlayData && (
        <ScenarioXPOverlay
          isVisible={showXPOverlay}
          xpData={xpOverlayData}
          totalXP={newTotalXP}
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

          {/* Botões de ação: Compartilhar e Download */}
          <div className="flex flex-row items-center justify-center gap-3 mt-6">
            <button
              type="button"
              aria-label="Compartilhar resultado"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-indigo-700 font-semibold shadow-sm hover:bg-indigo-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              onClick={() => {
                // Generate public results URL
                const publicUrl = `${window.location.origin}/#/public-results/${id}`;
                const shareText = `Veja meu resultado no assessment: ${assessmentName}! (${publicUrl})`;
                if (navigator.share) {
                  navigator.share({
                    title: assessmentName,
                    text: shareText,
                    url: publicUrl
                  });
                } else {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(publicUrl);
                    alert('Link copiado para a área de transferência!');
                  } else {
                    window.prompt('Copie o link do resultado:', publicUrl);
                  }
                }
              }}
            >
              <Share2 className="w-5 h-5" />
              Compartilhar
            </button>
            <button
              type="button"
              aria-label="Baixar PDF do resultado"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-indigo-700 font-semibold shadow-sm hover:bg-indigo-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              onClick={() => { /* ação futura para baixar PDF */ }}
            >
              <Download className="w-5 h-5" />
              Download
            </button>
          </div>
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
                    {/* Layout Mobile */}
                    <div className="sm:hidden">
                      <div className="flex items-center gap-4 mb-3">
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
                        <div className="flex-1">
                           {/* Código de progressão do usuário removido para acesso público */}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna Lateral (aderente no desktop) */}
          {Object.keys(indicatorResults).length > 0 && (
            <>
              {id ? (
                // Versão pública/compartilhada
                <div className="sticky top-6 space-y-6">
                  <CallToActionCardLong
                    title="Pronto para o próximo nível?"
                    description="Crie sua conta e comece a acompanhar seu progresso em diversos assessments."
                    buttonText="Criar minha conta"
                    onButtonClick={() => navigate('/register')}
                  />
                  <XPRewardWidget
                    totalXp={totalXp}
                    bonusXp={bonusXp}
                    xpConfig={xpConfig}
                    reached80={reached80}
                    reached90={reached90}
                    reached100={reached100}
                    bonus80={bonus80}
                    bonus90={bonus90}
                    bonus100={bonus100}
                    formatXP={formatXP}
                  />
                </div>
              ) : (
                // Versão para usuário logado
                <>
                  <div className="sticky top-6 space-y-6">
                    <XPRewardWidget
                      totalXp={totalXp}
                      bonusXp={bonusXp}
                      xpConfig={xpConfig}
                      reached80={reached80}
                      reached90={reached90}
                      reached100={reached100}
                      bonus80={bonus80}
                      bonus90={bonus90}
                      bonus100={bonus100}
                      formatXP={formatXP}
                    />
                    
                    {/* Sugestão de Assessments */}
                    {!suggestedLoading && suggestedAssessments.length > 0 && (
                      <div className="bg-white/80 border-white/60 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Próximos Passos</h3>
                        <div className="space-y-3">
                          {suggestedAssessments.map(sa => (
                            <button
                              key={sa.id}
                              onClick={() => navigate(`/assessment/${sa.id}`)}
                              className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <p className="font-semibold text-gray-700">{sa.name}</p>
                              <p className="text-sm text-gray-500 line-clamp-2">{sa.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
