import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Share2, ArrowRight, ToolCase, Zap, Check, X, Download, ChevronDown, ChevronUp } from 'lucide-react';
import XPRewardWidget from '../components/XPRewardWidget';
import CallToActionCardLong from '../components/CallToActionCardLong';
import { supabase } from '../supabaseClient';
import RadarChart from '../components/charts/RadarChart';
import HorizontalBarChart from '../components/charts/HorizontalBarChart';
import ScenarioXPOverlay from '../components/ScenarioXPOverlay';
import LevelsResultsDisplay from '../components/LevelsResultsDisplay';
import ItemResponsesModal from '../components/ItemResponsesModal';
import { TOKENS } from '../config/tokens';
import { getLucideIcon } from '../utils/iconUtils';
import { XP_CONFIG, calculateXP, formatXP } from '../utils/gamificationUtils';
import ResultsSkeleton from '../components/skeletons/ResultsSkeleton';
import { downloadAssessmentPdf } from '../utils/pdfDownload';
import PDFGenerationOverlay from '../components/PDFGenerationOverlay';

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

const textFadeOutStyles = `
  .text-fade-out {
    -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
    mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  }
`;

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

const normalizeAnswersSnapshot = (snapshot) => {
  if (!snapshot) return {};
  if (typeof snapshot === 'string') {
    try {
      return JSON.parse(snapshot);
    } catch {
      return {};
    }
  }
  return snapshot;
};

const findSelectedAlternative = (alternatives = [], answerValue) => {
  if (answerValue === undefined || answerValue === null) return null;

  const answerNumeric = Number(answerValue);

  return alternatives.find((alt) => {
    if (alt.id == answerValue || alt.score_value == answerValue) return true;

    const altNumeric = Number(alt.score_value);
    if (!Number.isNaN(answerNumeric) && !Number.isNaN(altNumeric)) {
      return altNumeric === answerNumeric;
    }

    return false;
  }) || null;
};

export default function PublicResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isPdfMode = searchParams.get('pdf') === '1';
  const forceExpandAll = isPdfMode || searchParams.get('expand') === 'all';
  const productionLoginUrl = import.meta.env.VITE_PRODUCTION_LOGIN_URL || 'https://assessments.paulocruzfilho.com/#/login';
  const productionSignupUrl = import.meta.env.VITE_PRODUCTION_SIGNUP_URL || productionLoginUrl;
  const signupQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(productionSignupUrl)}`;
  const normalizedRouteId = typeof id === 'string' ? id.trim() : '';
  const hasRouteId = normalizedRouteId.length > 0 && normalizedRouteId !== 'undefined' && normalizedRouteId !== 'null';
  const isValidUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  const isRouteIdValidUuid = hasRouteId && isValidUuid(normalizedRouteId);
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
  const [expandedIntroduction, setExpandedIntroduction] = useState(false);
  const [assessmentSchema, setAssessmentSchema] = useState(null);
  const [levelMode, setLevelMode] = useState(null);
  const [levels, setLevels] = useState([]);
  const [levelResults, setLevelResults] = useState({});
  const [levelRanges, setLevelRanges] = useState({}); // { level_id: [ranges] }
  const [noLevelAchievedTitle, setNoLevelAchievedTitle] = useState('');
  const [noLevelAchievedDescription, setNoLevelAchievedDescription] = useState('');
  const [expandedIndicatorInterpretations, setExpandedIndicatorInterpretations] = useState({});
  const [truncatedIndicatorInterpretations, setTruncatedIndicatorInterpretations] = useState({});
  const [showLevelBadges, setShowLevelBadges] = useState(true);
  const [indicatorAnswersMap, setIndicatorAnswersMap] = useState({});
  const [levelAnswersMap, setLevelAnswersMap] = useState({});
  const [showIndicatorAnswersModal, setShowIndicatorAnswersModal] = useState(false);
  const [selectedIndicatorAnswersKey, setSelectedIndicatorAnswersKey] = useState('');
  const [isPreAssessmentAccordionOpen, setIsPreAssessmentAccordionOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  useEffect(() => {
    // Removido: let mounted = true; (não necessário para página pública)
    const fetchResult = async () => {
      setLoading(true);
      setOverallRanges([]);
      try {
        if (hasRouteId && !isRouteIdValidUuid) {
          setError('Link de resultado inválido.');
          setLoading(false);
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
              schema,
              level_mode,
              visualization_type,
              pre_assessment_fields,
              gamify_xp,
              xp_completion,
              final_reflection,
              result_introduction,
              no_level_achieved_title,
              no_level_achieved_description,
              show_level_badges,
              assessments (
                id,
                name,
                description
              )
            )
          `);

        if (hasRouteId) {
          query = query.eq('id', normalizedRouteId);
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
          const answersData = normalizeAnswersSnapshot(data.answers_snapshot);
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
            // Preferir join já carregado para manter compatibilidade com links públicos.
            const nestedAssessmentInfo = data.assessment_versions?.assessments;
            let assessmentInfo = Array.isArray(nestedAssessmentInfo)
              ? (nestedAssessmentInfo[0] || null)
              : (nestedAssessmentInfo || null);
            if (!assessmentInfo && data.assessment_versions?.assessment_id) {
              const { data: fetchedAssessmentInfo } = await supabase
                .from('assessments')
                .select('id, name, description')
                .eq('id', data.assessment_versions.assessment_id)
                .maybeSingle();
              assessmentInfo = fetchedAssessmentInfo || null;
            }
            
            setAssessmentData({
              ...data.assessment_versions,
              id: assessmentInfo?.id || data.assessment_versions.assessment_id,
              name: assessmentInfo?.name || 'Assessment',
              description: assessmentInfo?.description || '',
              visualization_type: visualizationType,
              pre_assessment_fields: data.assessment_versions?.pre_assessment_fields || [],
              final_reflection: data.assessment_versions?.final_reflection || '',
              result_introduction: data.assessment_versions?.result_introduction || ''
            });

            setAssessmentSchema(data.assessment_versions?.schema || 'indicadores');
            setLevelMode(data.assessment_versions?.level_mode || 'single');
            setNoLevelAchievedTitle(data.assessment_versions?.no_level_achieved_title || '');
            setNoLevelAchievedDescription(data.assessment_versions?.no_level_achieved_description || '');
            setShowLevelBadges(data.assessment_versions?.show_level_badges !== false);

            // Se for assessment de níveis, buscar dados dos níveis
            if (data.assessment_versions.schema === 'niveis') {
              const { data: levelsData, error: levelsError } = await supabase
                .from('assessment_levels')
                .select('*')
                .eq('assessment_version_id', data.assessment_version_id)
                .order('display_order', { ascending: true });

              if (!levelsError && levelsData) {
                setLevels(levelsData);

                let levelAnswersPayload = {};
                const answerQuestionIds = Object.keys(answersData || {});

                try {
                  const { data: rpcLevelResponses, error: rpcLevelResponsesError } = await supabase
                    .rpc('get_public_level_responses', { p_event_id: data.id });

                  if (!rpcLevelResponsesError && rpcLevelResponses && typeof rpcLevelResponses === 'object') {
                    levelAnswersPayload = rpcLevelResponses;
                  } else if (rpcLevelResponsesError) {
                    console.warn('PublicResults: erro ao executar RPC de respostas por nível:', rpcLevelResponsesError);
                  }
                } catch (rpcLevelResponsesException) {
                  console.warn('PublicResults: exceção ao executar RPC de respostas por nível:', rpcLevelResponsesException);
                }

                if (Object.keys(levelAnswersPayload).length === 0 && answerQuestionIds.length > 0) {
                  const { data: answeredLevelQuestions } = await supabase
                    .from('questions')
                    .select(`
                      id,
                      text,
                      display_order,
                      level_id,
                      alternatives (
                        id,
                        text,
                        score_value
                      )
                    `)
                    .in('id', answerQuestionIds);

                  if (answeredLevelQuestions && answeredLevelQuestions.length > 0) {
                    const groupedQuestionsByLevel = {};
                    answeredLevelQuestions.forEach((question) => {
                      if (!question.level_id) return;
                      groupedQuestionsByLevel[question.level_id] = groupedQuestionsByLevel[question.level_id] || [];
                      groupedQuestionsByLevel[question.level_id].push(question);
                    });

                    levelsData.forEach((level) => {
                      const levelQuestions = (groupedQuestionsByLevel[level.id] || [])
                        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

                      levelAnswersPayload[level.id] = {
                        itemId: level.id,
                        name: level.name,
                        questions: levelQuestions.map((question) => {
                          const answer = answersData[question.id];
                          const selectedAlternative = findSelectedAlternative(question.alternatives, answer);

                          return {
                            questionId: question.id,
                            questionText: question.text || `Pergunta ${question.display_order || ''}`.trim(),
                            answerText: selectedAlternative?.text || null,
                            answerValue: selectedAlternative?.score_value ?? answer ?? null,
                            isAnswered: !!selectedAlternative
                          };
                        })
                      };
                    });
                  }
                }

                if (levelsData.length > 0) {
                  for (const level of levelsData) {
                    if (levelAnswersPayload[level.id]?.questions?.length > 0) {
                      continue;
                    }

                    const { data: levelQuestionsForAnswers } = await supabase
                      .from('questions')
                      .select(`
                        id,
                        text,
                        display_order,
                        alternatives (
                          id,
                          text,
                          score_value
                        )
                      `)
                      .eq('level_id', level.id)
                      .order('display_order', { ascending: true });

                    levelAnswersPayload[level.id] = {
                      itemId: level.id,
                      name: level.name,
                      questions: (levelQuestionsForAnswers || []).map((question) => {
                        const answer = answersData[question.id];
                        const selectedAlternative = findSelectedAlternative(question.alternatives, answer);

                        return {
                          questionId: question.id,
                          questionText: question.text || `Pergunta ${question.display_order || ''}`.trim(),
                          answerText: selectedAlternative?.text || null,
                          answerValue: selectedAlternative?.score_value ?? answer ?? null,
                          isAnswered: !!selectedAlternative
                        };
                      })
                    };
                  }
                }

                setLevelAnswersMap(levelAnswersPayload);

                // Carregar ranges de interpretação para cada nível
                const levelIds = levelsData.map(l => l.id);
                if (levelIds.length > 0) {
                  try {
                    const { data: rangesData, error: rangesError } = await supabase
                      .from('assessment_level_ranges')
                      .select('*')
                      .in('assessment_level_id', levelIds)
                      .order('min_score', { ascending: true });

                    if (rangesData && !rangesError) {
                      const rangesMap = {};
                      rangesData.forEach(range => {
                        if (!rangesMap[range.assessment_level_id]) {
                          rangesMap[range.assessment_level_id] = [];
                        }
                        rangesMap[range.assessment_level_id].push(range);
                      });
                      setLevelRanges(rangesMap);
                    }
                  } catch (err) {
                    // Tabela pode não existir ainda - continuar sem ranges
                    console.warn('Não foi possível carregar ranges de níveis:', err);
                  }
                }

                // 1) Fonte principal: cálculo server-side (mais confiável em links públicos)
                let hasRpcLevelResults = false;
                try {
                  const { data: rpcLevelResults, error: rpcError } = await supabase
                    .rpc('get_public_level_results', { p_event_id: data.id });

                  if (!rpcError && rpcLevelResults && typeof rpcLevelResults === 'object') {
                    const rpcHasAnyScore = Object.values(rpcLevelResults).some(
                      (item) => (Number(item?.levelScore) || 0) > 0 || (Number(item?.potentialScore) || 0) > 0
                    );

                    if (rpcHasAnyScore) {
                      setLevelResults(rpcLevelResults);
                      hasRpcLevelResults = true;
                      console.warn('PublicResults: resultados de níveis carregados via RPC.', {
                        eventId: data.id,
                        levelsCount: Object.keys(rpcLevelResults).length
                      });
                    }
                  } else if (rpcError) {
                    console.warn('PublicResults: erro ao executar RPC de níveis:', rpcError);
                  }
                } catch (rpcException) {
                  console.warn('PublicResults: exceção ao executar RPC de níveis:', rpcException);
                }

                // 2) Fallback client-side (mantido por segurança)
                if (!hasRpcLevelResults) {
                  const levelResultsMap = {};

                  if (levelsData.length > 0) {
                    for (const level of levelsData) {
                      const { data: questionsData, error: questionsError } = await supabase
                        .from('questions')
                        .select(`
                          id,
                          text,
                          display_order,
                          alternatives (
                            id,
                            text,
                            score_value,
                            score_target
                          )
                        `)
                        .eq('level_id', level.id);

                      if (questionsError) {
                        console.warn('Erro ao carregar perguntas do nível em PublicResults:', {
                          levelId: level.id,
                          error: questionsError
                        });
                      }

                      let levelScore = 0;
                      let potentialScore = 0;
                      let maxLevelScore = 0;
                      let maxPotentialScore = 0;
                      let maxTotalScore = 0;

                      if (questionsData) {
                        questionsData.forEach(question => {
                          const answer = answersData[question.id];
                          const selectedAlternative = findSelectedAlternative(question.alternatives, answer);

                          let questionMaxLevel = 0;
                          let questionMaxPotential = 0;
                          let questionMaxTotal = 0;

                          question.alternatives.forEach(alt => {
                            const altTarget = alt.score_target || 'level';
                            const altScore = parseFloat(alt.score_value) || 0;

                            if (altScore > questionMaxTotal) {
                              questionMaxTotal = altScore;
                            }

                            if (altTarget === 'level' && altScore > questionMaxLevel) {
                              questionMaxLevel = altScore;
                            } else if (altTarget === 'potential' && altScore > questionMaxPotential) {
                              questionMaxPotential = altScore;
                            }
                          });

                          maxLevelScore += questionMaxLevel;
                          maxPotentialScore += questionMaxPotential;
                          maxTotalScore += questionMaxTotal;

                          if (answer !== undefined && answer !== null) {
                            if (selectedAlternative) {
                              const scoreValue = parseFloat(selectedAlternative.score_value) || 0;
                              const scoreTarget = selectedAlternative.score_target || 'level';

                              if (scoreTarget === 'level') {
                                levelScore += scoreValue;
                              } else if (scoreTarget === 'potential') {
                                potentialScore += scoreValue;
                              }
                            }
                          }
                        });
                      }

                      levelResultsMap[level.id] = {
                        level_id: level.id,
                        name: level.name,
                        description: level.description,
                        levelScore,
                        potentialScore,
                        maxLevelScore,
                        maxPotentialScore,
                        maxTotalScore,
                        display_order: level.display_order,
                        acquire_threshold: level.acquire_threshold
                      };
                    }
                  }

                  setLevelResults(levelResultsMap);
                }
              }
            } else {
              // Lógica original para indicadores
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

              const answerQuestionIds = Object.keys(answersData || {});
              if (answerQuestionIds.length > 0) {
                const { data: answeredQuestionsData } = await supabase
                  .from('questions')
                  .select(`
                    id,
                    text,
                    display_order,
                    indicator_id,
                    indicators (
                      id,
                      name,
                      indicator_master_id
                    ),
                    alternatives (
                      id,
                      text,
                      score_value
                    )
                  `)
                  .in('id', answerQuestionIds);

                if (answeredQuestionsData) {
                  const questionsByMasterId = {};
                  const questionsByIndicatorName = {};

                  answeredQuestionsData.forEach((question) => {
                    const indicatorRow = Array.isArray(question.indicators)
                      ? question.indicators[0]
                      : question.indicators;

                    if (indicatorRow?.indicator_master_id) {
                      const masterKey = String(indicatorRow.indicator_master_id);
                      questionsByMasterId[masterKey] = questionsByMasterId[masterKey] || [];
                      questionsByMasterId[masterKey].push(question);
                    }

                    if (indicatorRow?.name) {
                      const nameKey = String(indicatorRow.name);
                      questionsByIndicatorName[nameKey] = questionsByIndicatorName[nameKey] || [];
                      questionsByIndicatorName[nameKey].push(question);
                    }
                  });

                  const answersPayload = {};
                  indicatorsData.forEach((indicator) => {
                    const indicatorMasterId = indicator.indicator_master_id ? String(indicator.indicator_master_id) : null;
                    const indicatorName = indicator.indicators_master?.name ? String(indicator.indicators_master.name) : null;

                    const sourceQuestions = [
                      ...(indicatorMasterId ? (questionsByMasterId[indicatorMasterId] || []) : []),
                      ...(indicatorName ? (questionsByIndicatorName[indicatorName] || []) : [])
                    ];

                    const uniqueQuestions = Array.from(
                      new Map(sourceQuestions.map((q) => [q.id, q])).values()
                    ).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

                    const questions = uniqueQuestions.map((question) => {
                      const answer = answersData[question.id];
                      const selectedAlternative = findSelectedAlternative(question.alternatives, answer);

                      return {
                        questionId: question.id,
                        questionText: question.text || `Pergunta ${question.display_order || ''}`.trim(),
                        answerText: selectedAlternative?.text || null,
                        answerValue: selectedAlternative?.score_value ?? answer ?? null,
                        isAnswered: !!selectedAlternative
                      };
                    });

                    const itemPayload = {
                      itemId: indicator.id,
                      name: indicator.indicators_master?.name || 'Indicador',
                      questions
                    };

                    if (indicator.id) answersPayload[String(indicator.id)] = itemPayload;
                    if (indicator.indicator_master_id) answersPayload[String(indicator.indicator_master_id)] = itemPayload;
                    if (itemPayload.name) answersPayload[String(itemPayload.name)] = itemPayload;
                  });

                  setIndicatorAnswersMap(answersPayload);
                }
              }
            }
            }

            // Buscar overall_ranges para interpretação do resultado geral
            const versionId = data.assessment_version_id;
            const { data: overallRangesData, error: overallError } = await supabase
              .from('assessment_overall_ranges')
              .select('*')
              .eq('assessment_version_id', versionId)
              .order('min_score', { ascending: true });

            if (!overallError && overallRangesData && overallRangesData.length > 0) {
              setOverallRanges(overallRangesData);
            } else {
              if (overallError) {
                console.warn('⚠️ Aviso ao carregar overall_ranges via select direto:', overallError);
              }
              setOverallRanges([]);
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
  }, [hasRouteId, id, isRouteIdValidUuid, normalizedRouteId]);

  useEffect(() => {
    if (loading || assessmentSchema === 'niveis') return;

    let rafId;

    const checkIndicatorTruncation = () => {
      rafId = window.requestAnimationFrame(() => {
        const nodes = document.querySelectorAll('[data-indicator-interpretation-key]');
        const newTruncated = {};

        nodes.forEach((node) => {
          const key = node.getAttribute('data-indicator-interpretation-key');
          if (!key) return;

          const originalClass = node.className;
          node.className = originalClass.replace(/line-clamp-\d+/g, '').replace(/text-fade-out/g, '');

          const fullHeight = node.scrollHeight;
          const computedStyle = window.getComputedStyle(node);
          const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
          const maxHeight = lineHeight * 5;

          node.className = originalClass;
          newTruncated[key] = fullHeight > (maxHeight + 1);
        });

        setTruncatedIndicatorInterpretations(newTruncated);
      });
    };

    checkIndicatorTruncation();
    window.addEventListener('resize', checkIndicatorTruncation);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', checkIndicatorTruncation);
    };
  }, [loading, assessmentSchema, result, expandedIndicatorInterpretations]);

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

  useEffect(() => {
    const isDesktop = window.innerWidth >= 1024;
    setIsPreAssessmentAccordionOpen(forceExpandAll ? true : isDesktop);
  }, [result?.id, forceExpandAll]);

  if (loading) return <ResultsSkeleton />;
  if (error) return <div className="p-12 text-center text-red-600">{error}</div>;
  if (!result) return <div className="p-12 text-center">Nenhum assessment encontrado.</div>;

  const total = result.total_score ?? 0;
  const max = result.max_possible_score ?? 0;
  const percentageRaw = max > 0 ? (total / max) * 100 : 0;
  const percentage = Math.round(percentageRaw);
  
  // Calcular interpretação geral usar as overall_ranges
  let overallInterpretation = '';
  let overallLabel = classifyFallback(percentage);
  if (overallRanges.length > 0) {
    const range = overallRanges.find((r) => {
      const min = Number(r.min_score);
      const maxRange = Number(r.max_score);
      return percentageRaw >= min && percentageRaw <= maxRange;
    });
    if (range) {
      overallLabel = range.label;
      overallInterpretation = range.interpretation || '';
    }
  }

  const classification = overallLabel;

  const assessmentName = assessmentData?.name || result?.assessment_versions?.assessment_id || 'Assessment';
  const assessmentDescription = assessmentData?.description || '';
  const introductionText = assessmentData?.result_introduction || result?.assessment_versions?.result_introduction || '';
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
        indicator_id: v?.indicator_id || (isValidUuid(k) ? k : null),
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

  const toggleIndicatorInterpretation = (key) => {
    setExpandedIndicatorInterpretations((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const sortedIndicators = Object.entries(indicatorResults)
    .sort(([, a], [, b]) => (b?.percentage ?? 0) - (a?.percentage ?? 0));

  const preAssessmentData = normalizeAnswersSnapshot(result?.pre_assessment_data);
  const configuredPreAssessmentFields = Array.isArray(assessmentData?.pre_assessment_fields)
    ? assessmentData.pre_assessment_fields
    : Array.isArray(result?.assessment_versions?.pre_assessment_fields)
      ? result.assessment_versions.pre_assessment_fields
      : [];

  const hasPreAssessmentValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  const formatPreAssessmentValue = (value) => {
    if (!hasPreAssessmentValue(value)) return 'Não informado';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return String(value);
  };

  const preAssessmentAnswerItems = (() => {
    const consumedKeys = new Set();

    const fromConfiguredFields = configuredPreAssessmentFields.map((field) => {
      const fieldKey = String(field.id);
      consumedKeys.add(fieldKey);
      return {
        key: fieldKey,
        label: field.label || fieldKey,
        value: preAssessmentData?.[field.id]
      };
    });

    const additionalAnswers = Object.entries(preAssessmentData || {})
      .filter(([key, value]) => !consumedKeys.has(String(key)) && hasPreAssessmentValue(value))
      .map(([key, value]) => ({
        key,
        label: key,
        value
      }));

    return [...fromConfiguredFields, ...additionalAnswers];
  })();

  const shouldShowPreAssessmentAnswers = configuredPreAssessmentFields.length > 0 && preAssessmentAnswerItems.length > 0;

  const renderPreAssessmentAnswersCard = () => (
    <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-sm">
      <div>
        <button
          type="button"
          onClick={() => !forceExpandAll && setIsPreAssessmentAccordionOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-left py-1 mb-2 min-h-6"
        >
          <span className="text-[#4F46E5] font-bold text-xs uppercase tracking-widest leading-none">
            Respostas pré-assessment
          </span>
          {!forceExpandAll && (
            <span className="inline-flex items-center justify-center h-[18px] w-[18px] flex-shrink-0">
              {isPreAssessmentAccordionOpen ? <ChevronUp size={18} className="text-[#4F46E5]" /> : <ChevronDown size={18} className="text-[#4F46E5]" />}
            </span>
          )}
        </button>

        {isPreAssessmentAccordionOpen && (
          <div className="space-y-4 mt-3">
            {preAssessmentAnswerItems.map((item) => (
              <div key={item.key} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                <p className="text-sm font-semibold text-[#1E1B4B] mb-1">{item.label}</p>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed break-words">
                  {formatPreAssessmentValue(item.value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const indicatorModalItems = sortedIndicators.map(([key, value]) => {
    const possibleKeys = [value?.indicator_id, key, value?.name].filter(Boolean).map(String);
    const selectedKey = possibleKeys.find((k) => indicatorAnswersMap[k]) || possibleKeys[0] || String(key);
    const answersData = indicatorAnswersMap[selectedKey];

    return {
      key: selectedKey,
      label: resolveName(key, value),
      questions: answersData?.questions || []
    };
  });

  const openIndicatorAnswers = (key, value) => {
    const possibleKeys = [value?.indicator_id, key, value?.name].filter(Boolean).map(String);
    const selectedKey = possibleKeys.find((k) => indicatorAnswersMap[k]) || possibleKeys[0] || String(key);
    setSelectedIndicatorAnswersKey(selectedKey);
    setShowIndicatorAnswersModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF]" data-public-results-ready="true">
      <style>{textFadeOutStyles}</style>
      {/* XP Overlay - Mesmo componente do Assessment */}
      {xpOverlayData && (
        <ScenarioXPOverlay
          isVisible={showXPOverlay}
          xpData={xpOverlayData}
          totalXP={newTotalXP}
          onClose={() => setShowXPOverlay(false)}
        />
      )}

      <ItemResponsesModal
        isOpen={showIndicatorAnswersModal}
        onClose={() => setShowIndicatorAnswersModal(false)}
        title="Respostas por indicador"
        itemLabel="Indicador"
        items={indicatorModalItems}
        selectedKey={selectedIndicatorAnswersKey}
        onSelect={setSelectedIndicatorAnswersKey}
      />

      <PDFGenerationOverlay isVisible={isDownloadingPdf} />

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
          {!isPdfMode && <div className="flex flex-row items-center justify-center gap-3 mt-6" data-pdf-hide="true">
            <button
              type="button"
              aria-label="Compartilhar resultado"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-indigo-700 font-semibold shadow-sm hover:bg-indigo-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              onClick={() => {
                // Generate public results URL
                const shareResultId = result?.id || (isRouteIdValidUuid ? normalizedRouteId : null);
                if (!shareResultId) {
                  alert('Não foi possível gerar o link público deste resultado.');
                  return;
                }
                const publicUrl = `${window.location.origin}/#/public-results/${shareResultId}`;
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
              onClick={async () => {
                const eventId = result?.id || (isRouteIdValidUuid ? normalizedRouteId : null);
                if (!eventId) {
                  alert('Não foi possível identificar o resultado para gerar o PDF.');
                  return;
                }

                try {
                  setIsDownloadingPdf(true);
                  await downloadAssessmentPdf({
                    assessmentEventId: eventId,
                    source: 'public',
                    assessmentName,
                    versionToken: `${result?.updated_at || result?.created_at || 'v1'}-pdf-v4`
                  });
                } catch (downloadError) {
                  console.error('Erro ao baixar PDF público:', downloadError);
                  alert(downloadError?.message || 'Não foi possível gerar o PDF no momento.');
                } finally {
                  setIsDownloadingPdf(false);
                }
              }}
            >
              <Download className="w-5 h-5" />
              Download
            </button>
          </div>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
          {/* Coluna principal - rola normalmente */}
          <div>
            {introductionText && (
              <div className="mb-8 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-sm">
                <p className="text-[#4F46E5] font-bold text-xs uppercase tracking-widest mb-3">
                  Introdução
                </p>
                <div>
                  <div
                    className={`prose prose-sm mt-6 sm:text-lg sm:prose-base max-w-none text-gray-700 leading-relaxed text-justify [text-align-last:left] overflow-hidden transition-all duration-300 [&_p]:mb-4 [&_p]:text-base [&_p]:leading-relaxed [&_ul]:my-4 [&_ol]:my-4 [&_li]:my-1 [&_strong]:font-semibold [&_em]:italic [&_a]:text-[#4F46E5] [&_a]:underline ${
                      expandedIntroduction || forceExpandAll ? '' : 'line-clamp-5 text-fade-out'
                    }`}
                    dangerouslySetInnerHTML={{ __html: introductionText }}
                  />
                  {!forceExpandAll && !expandedIntroduction && (
                    <button
                      type="button"
                      onClick={() => setExpandedIntroduction(true)}
                      className="mt-2 text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                      Ver mais <ChevronDown size={16} />
                    </button>
                  )}
                  {!forceExpandAll && expandedIntroduction && (
                    <button
                      type="button"
                      onClick={() => setExpandedIntroduction(false)}
                      className="mt-3 text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                      Ver menos <ChevronUp size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-start justify-between gap-6">
                <div className="text-left">
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

            {/* RESULTADOS DE NÍVEIS */}
            {assessmentSchema === 'niveis' && (
              <LevelsResultsDisplay
                levelResults={levelResults}
                levelMode={levelMode}
                levels={levels}
                levelRanges={levelRanges}
                noLevelAchievedTitle={noLevelAchievedTitle}
                noLevelAchievedDescription={noLevelAchievedDescription}
                showLevelBadges={showLevelBadges}
                levelAnswerItems={levelAnswersMap}
                forceExpandForPdf={forceExpandAll}
              />
            )}

            {/* RESULTADOS DE INDICADORES */}
            {assessmentSchema !== 'niveis' && assessmentData && Array.isArray(assessmentData.visualization_type) && assessmentData.visualization_type.length > 0 && (
              <div className="mt-8 grid gap-6">
                {/* Se ambos os gráficos estão selecionados, renderizar no mesmo card */}
                {assessmentData.visualization_type.includes('radar') && assessmentData.visualization_type.includes('horizontal-bar') ? (
                  <div className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm space-y-8">
                    <RadarChart indicatorResults={indicatorResults} indicatorMeta={indicatorsMeta} defaultLegendOpen={forceExpandAll} forceLegendOpen={forceExpandAll} onItemClick={(key) => { document.getElementById(`indicator-card-${String(key)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
                    <div className="border-t border-gray-200 pt-6">
                      <HorizontalBarChart indicatorResults={indicatorResults} indicatorMeta={indicatorsMeta} />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Renderizar gráficos individualmente */}
                    {assessmentData.visualization_type.includes('radar') && (
                      <div className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm">
                        <RadarChart indicatorResults={indicatorResults} indicatorMeta={indicatorsMeta} defaultLegendOpen={forceExpandAll} forceLegendOpen={forceExpandAll} onItemClick={(key) => { document.getElementById(`indicator-card-${String(key)}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
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

            {assessmentSchema !== 'niveis' && (
            <div className="mt-8 grid gap-4">
              {sortedIndicators
                .map(([key, value]) => {
                  const meta = resolveMeta(key, value);
                  const displayName = resolveName(key, value);
                  const indicatorKey = String(key);
                  const IndicatorIcon = meta?.icon ? getLucideIcon(meta.icon) : null;
                  const badgeStyle = getIndicatorBadgeStyle(value.percentage);
                  return (
                    <div key={key} id={`indicator-card-${String(key)}`} className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm">
                      {/* Mobile layout */}
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
                            <h3 className="text-lg font-semibold text-[#1E1B4B]">{displayName}</h3>
                          </div>
                        </div>
                        <span
                          className="flex items-center justify-center w-full px-3 py-2 text-xs font-bold rounded-full uppercase"
                          style={badgeStyle}
                        >
                          {value.percentage}% • {value.classification}
                        </span>
                      </div>
                      {/* Desktop layout */}
                      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-4">
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
                            style={badgeStyle}
                          >
                            {value.classification}
                          </span>
                          <p className="text-2xl font-semibold text-[#1E1B4B] mt-2">{value.percentage}%</p>
                        </div>
                      </div>
                      <div className="mt-6">
                        <p
                          data-indicator-interpretation-key={indicatorKey}
                          className={`text-base sm:text-lg text-gray-700 leading-relaxed text-justify [text-align-last:left] ${
                            forceExpandAll || expandedIndicatorInterpretations[indicatorKey]
                              ? ''
                              : truncatedIndicatorInterpretations[indicatorKey]
                                ? 'line-clamp-5 text-fade-out'
                                : ''
                          }`}
                        >
                          {value.interpretation}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-4">
                          <div>
                            {!forceExpandAll && truncatedIndicatorInterpretations[indicatorKey] && !expandedIndicatorInterpretations[indicatorKey] && (
                              <button
                                onClick={() => toggleIndicatorInterpretation(indicatorKey)}
                                className="text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity"
                              >
                                Ver mais
                              </button>
                            )}

                            {!forceExpandAll && expandedIndicatorInterpretations[indicatorKey] && (
                              <button
                                onClick={() => toggleIndicatorInterpretation(indicatorKey)}
                                className="text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity"
                              >
                                Ver menos
                              </button>
                            )}
                          </div>

                          {!isPdfMode && (
                            <button
                              onClick={() => openIndicatorAnswers(indicatorKey, value)}
                              className="text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity"
                            >
                              Ver respostas
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            )}

            {shouldShowPreAssessmentAnswers && (
              <div className="lg:hidden mt-8">
                {renderPreAssessmentAnswersCard()}
              </div>
            )}
          </div>

          {/* Coluna Lateral (aderente no desktop) */}
          {(id || Object.keys(indicatorResults).length > 0) && (
            <>
              {id ? (
                // Versão pública/compartilhada
                <div className="sticky top-6 space-y-6">
                  <CallToActionCardLong
                    title="Pronto para o próximo nível?"
                    description="Crie sua conta e comece a acompanhar seu progresso em diversos assessments."
                    buttonText={isPdfMode ? '' : 'Criar minha conta'}
                    buttonHref={isPdfMode ? '' : productionSignupUrl}
                    openInNewTab
                    extraContent={isPdfMode ? (
                      <div className="w-full flex flex-col items-center mb-6">
                        <img
                          src={signupQrCodeUrl}
                          alt="QR Code para criar conta"
                          className="w-40 h-40 rounded-lg border border-white/40 bg-white p-1"
                          loading="lazy"
                        />
                        <p className="mt-3 text-center text-white text-sm font-medium leading-relaxed">
                          In.Assessment é uma plataforma desenvolvida por BNDR Design
                        </p>
                      </div>
                    ) : null}
                  />

                  {shouldShowPreAssessmentAnswers && (
                    <div className="hidden lg:block">
                      {renderPreAssessmentAnswersCard()}
                    </div>
                  )}
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

                    {shouldShowPreAssessmentAnswers && (
                      <div className="hidden lg:block">
                        {renderPreAssessmentAnswersCard()}
                      </div>
                    )}
                    
                    {/* Sugestão de Assessments */}
                    {!isPdfMode && !suggestedLoading && suggestedAssessments.length > 0 && (
                      <div className="bg-white/80 border-white/60 rounded-2xl p-6 shadow-sm" data-pdf-hide="true">
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
