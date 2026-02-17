import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';
import RadarChart from '../components/charts/RadarChart';
import HorizontalBarChart from '../components/charts/HorizontalBarChart';
import { useProgressionUpdate } from '../hooks/useProgressionUpdate';

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
  const [expandedIndicators, setExpandedIndicators] = useState({});
  const [overallRanges, setOverallRanges] = useState([]);

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
              assessment_id
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

          // Atualizar progressão do usuário após completar a atividade
          try {
            if (data?.total_score !== undefined && data?.max_possible_score !== undefined) {
              console.log('🎮 Iniciando atualização de progressão...');
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

          // Buscar dados do assessment com visualization_type
          if (data?.assessment_versions?.assessment_id) {
            const { data: assData, error: assError } = await supabase
              .from('assessments')
              .select('*')
              .eq('id', data.assessment_versions.assessment_id)
              .single();

            if (!assError && assData) {
              // Normalizar visualization_type para array
              let normalized = assData;
              if (normalized.visualization_type) {
                if (typeof normalized.visualization_type === 'string') {
                  normalized.visualization_type = [normalized.visualization_type];
                } else if (!Array.isArray(normalized.visualization_type)) {
                  normalized.visualization_type = normalized.visualization_type || ['radar'];
                }
              } else {
                normalized.visualization_type = ['radar'];
              }
              if (mounted) setAssessmentData(normalized);
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

              // Mapear ranges por nome do indicador
              const rangesMap = {};
              const metaMap = {};
              console.log('🔍 DEBUG Results: Indicadores com ranges (indicatorsData):', indicatorsData);
              indicatorsData.forEach(ind => {
                const indicatorName = ind.indicators_master?.name;
                const indicatorMasterId = ind.indicator_master_id;
                const masterDescription = ind.indicators_master?.description || '';
                
                console.log(`\n  Processando: "${indicatorName}" (master_id: ${indicatorMasterId})`);
                console.log(`    Master description: "${masterDescription.substring(0, 50)}..."`);
                
                if (indicatorName) {
                  if (ind.assessment_indicator_ranges) {
                    rangesMap[indicatorName] = ind.assessment_indicator_ranges.sort(
                      (a, b) => a.min_score - b.min_score
                    );
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
                  
                  metaMap[indicatorName] = {
                    color: ind.indicators_master?.color || '#6366F1',
                    icon: ind.indicators_master?.icon || 'circle',
                    conceptual_description: conceptualDesc
                  };
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
  const date = result.created_at ? new Date(result.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-';
  const versionNumber = result.assessment_versions?.version_number || '—';

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
    const totalOverall = Object.values(indicatorScores).reduce((s, v) => s + (Number(v) || 0), 0);
    Object.entries(indicatorScores).forEach(([k, v]) => {
      const score = Number(v) || 0;
      const maxForIndicator = max > 0 && totalOverall > 0 ? Math.round((score / Math.max(1, totalOverall)) * max) : 0;
      
      // Usar ranges do banco de dados para classificação
      const ranges = assessmentRanges[k] || [];
      const classificationData = getClassificationFromRanges(score, maxForIndicator, ranges, k);
      console.log(`📊 DEBUG Results - ${k}: Score ${score}/${maxForIndicator}, Ranges:`, ranges, 'Classificação:', classificationData);
      
      out[k] = {
        score,
        maxScore: maxForIndicator,
        percentage: classificationData.percentage,
        classification: classificationData.classification,
        interpretation: classificationData.interpretation
      };
    });
    return out;
  })();

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-semibold">Resultado do Assessment</h1>
        {id && (
          <button onClick={() => navigate('/history')} className="text-sm text-[#4F46E5] hover:underline whitespace-nowrap">
            ← Voltar
          </button>
        )}
      </div>

      {/* Resumo */}
      <div className="p-6 md:p-8 border rounded-2xl bg-white shadow-sm flex flex-col md:flex-row items-start gap-8 mb-8">
        <div className="flex-0 text-center">
          <div className="text-5xl md:text-6xl font-extrabold text-[#4F46E5]">{percentage}%</div>
          <div className="mt-2 text-sm text-gray-500">{classification}</div>
        </div>

        <div className="flex-1 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border rounded-lg text-center">
              <div className="text-xs text-gray-500">Score total</div>
              <div className="text-lg font-medium">{total}</div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="text-xs text-gray-500">Score máximo</div>
              <div className="text-lg font-medium">{max}</div>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <div className="text-xs text-gray-500">Data e Hora</div>
              <div className="text-lg font-medium text-xs">{date}</div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded text-center mb-4">
            <span className="text-xs text-gray-500 mr-2">Versão:</span>
            <span className="text-sm font-semibold text-gray-700">v{versionNumber}</span>
          </div>

          {overallInterpretation && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-blue-900">Classificação:</span>
                <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700">{overallLabel}</span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-semibold text-blue-900">Interpretação:</span> {overallInterpretation}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Visualizações dos Indicadores (Gráficos) */}
      {assessmentData && Array.isArray(assessmentData.visualization_type) && assessmentData.visualization_type.length > 0 && (
        <div className="space-y-8 mb-8">
          {assessmentData.visualization_type.includes('radar') && (
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <RadarChart indicatorResults={indicatorResults} indicatorMeta={indicatorsMeta} />
            </div>
          )}
          {assessmentData.visualization_type.includes('horizontal-bar') && (
            <div className="bg-white border rounded-lg p-6 shadow-sm">
              <HorizontalBarChart indicatorResults={indicatorResults} indicatorMeta={indicatorsMeta} />
            </div>
          )}
        </div>
      )}

      {/* Detalhes dos Indicadores */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 text-gray-800">Detalhes dos Indicadores</h2>
        <div className="space-y-4">
          {Object.entries(indicatorResults).map(([k, v]) => {
            const meta = indicatorsMeta[k] || {};
            const isExpanded = expandedIndicators[k];
            return (
              <div key={k} className="p-4 border rounded-lg hover:bg-gray-50 transition">
                <div className="flex items-start gap-3 mb-2">
                  {/* Ícone com cor */}
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-1"
                    style={{ backgroundColor: meta.color || '#6366F1' }}
                  >
                    <span className="text-xs font-bold text-white">●</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <h4 className="font-semibold text-gray-800">{k}</h4>
                      <div className="text-sm text-gray-600 flex-shrink-0">{v.score}/{v.maxScore}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-semibold text-[#4F46E5]">{v.percentage}%</div>
                      <div className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${v.classification === 'Crítico' ? 'bg-red-100 text-red-700' : v.classification === 'Moderado' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {v.classification}
                      </div>
                    </div>
                    {v.interpretation && <p className="mt-2 text-sm text-gray-600 leading-relaxed">{v.interpretation}</p>}
                    
                    {/* Conceptual Description - Expansível */}
                    {meta.conceptual_description && (
                      <div className="mt-3">
                        <button
                          onClick={() => setExpandedIndicators(prev => ({ ...prev, [k]: !prev[k] }))}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                        >
                          {isExpanded ? '▼' : '▶'} {isExpanded ? 'Ocultar' : 'Saiba mais sobre este indicador'}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 pl-4 border-l-2 border-indigo-200 text-sm text-gray-700 leading-relaxed">
                            {meta.conceptual_description}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
