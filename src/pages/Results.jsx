import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Share2, ArrowRight, ToolCase, Zap, Check, X, Download, ChevronDown, ChevronUp, Info } from 'lucide-react';
import XPRewardWidget from '../components/XPRewardWidget';
import CallToActionCardLong from '../components/CallToActionCardLong';
import { supabase } from '../supabaseClient';
import RadarChart from '../components/charts/RadarChart';
import HorizontalBarChart from '../components/charts/HorizontalBarChart';
import ScenarioXPOverlay from '../components/ScenarioXPOverlay';
import LevelsResultsDisplay from '../components/LevelsResultsDisplay';
import ItemResponsesModal from '../components/ItemResponsesModal';
import { useProgressionUpdate } from '../hooks/useProgressionUpdate';
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

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromHistory = searchParams.get('from') === 'history';
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
  const [newTotalXP, setNewTotalXP] = useState(0);
  const [expandedIntroduction, setExpandedIntroduction] = useState(false);
  const [assessmentSchema, setAssessmentSchema] = useState(null); // 'indicadores' | 'niveis'
  const [levelMode, setLevelMode] = useState(null); // 'single' | 'multi'
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
              schema,
              level_mode,
              visualization_type,
              pre_assessment_fields,
              final_reflection,
              result_introduction,
              no_level_achieved_title,
              no_level_achieved_description,
              gamify_xp,
              xp_completion,
              xp_score_80_89,
              xp_score_90_99,
              xp_score_100,
              show_level_badges
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
          const answersData = normalizeAnswersSnapshot(data.answers_snapshot);

          // Verificar se XP já foi concedido anteriormente
          const isFirstVisit = data.xp_awarded === false || data.xp_awarded === null;
          
          // Verificar se o assessment tem gamificação XP habilitada
          const hasXPGamification = data?.assessment_versions?.gamify_xp && data?.assessment_versions?.xp_completion > 0;
          
          // Atualizar progressão do usuário apenas na primeira visita E quando NÃO vier do histórico E quando gamificação estiver ativada
          if (isFirstVisit && !fromHistory && hasXPGamification) {
            try {
              if (data?.total_score !== undefined && data?.max_possible_score !== undefined) {
                const activityType = data.activity_type || 'assessment';
                const progressResult = await updateUserProgression(
                  user.id,
                  data.total_score,
                  data.max_possible_score,
                  activityType
                );
                
                if (progressResult.success) {
                  
                  // Marcar XP como concedido
                  await supabase
                    .from('assessment_events')
                    .update({ xp_awarded: true })
                    .eq('id', data.id);
                  
                  // Preparar dados do overlay XP no formato esperado por ScenarioXPOverlay
                  const xpGained = progressResult.xpGained || 0;
                  const xpConfig = XP_CONFIG[activityType] || XP_CONFIG.assessment;
                  const percentage = data.max_possible_score > 0 ? Math.round((data.total_score / data.max_possible_score) * 100) : 0;
                  
                  // Calcular XP base e bônus
                  let baseXP = xpConfig.base || 0;
                  let bonusXP = 0;
                  
                  if (percentage >= 100 && xpConfig.bonusThresholds?.[100]) {
                    bonusXP = xpConfig.bonusThresholds[100];
                  } else if (percentage >= 90 && xpConfig.bonusThresholds?.[90]) {
                    bonusXP = xpConfig.bonusThresholds[90];
                  } else if (percentage >= 80 && xpConfig.bonusThresholds?.[80]) {
                    bonusXP = xpConfig.bonusThresholds[80];
                  }
                  
                  // Preparar bonuses com rótulos corretos baseado na faixa de performance
                  const bonusesObj = {};
                  let bonusLabel = '';
                  
                  if (percentage >= 100) {
                    bonusLabel = 'Resultado de 100%';
                    bonusesObj[bonusLabel] = bonusXP;
                  } else if (percentage >= 90) {
                    bonusLabel = 'Resultado de 90 a 99%';
                    bonusesObj[bonusLabel] = bonusXP;
                  } else if (percentage >= 80) {
                    bonusLabel = 'Resultado de 80 a 89%';
                    bonusesObj[bonusLabel] = bonusXP;
                  }
                  
                  // Preparar breakdown
                  const breakdown = [];
                  if (baseXP > 0) {
                    breakdown.push({
                      label: `Completar ${activityType}`,
                      xp: baseXP,
                      achieved: true
                    });
                  }
                  if (bonusXP > 0) {
                    breakdown.push({
                      label: bonusLabel,
                      xp: bonusXP,
                      achieved: true
                    });
                  }
                  
                  if (mounted) {
                    // Formato para ScenarioXPOverlay
                    setXpOverlayData({
                      baseXP,
                      bonuses: bonusesObj,
                      breakdown,
                      totalXP: xpGained
                    });
                    setNewTotalXP(progressResult.totalXP);
                    setShowXPOverlay(true);
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
          } else if (isFirstVisit && !fromHistory && !hasXPGamification) {
            // Se a gamificação não estiver ativada, apenas marcar como processado
            await supabase
              .from('assessment_events')
              .update({ xp_awarded: true })
              .eq('id', data.id);
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
            }

            // Se for assessment de níveis, buscar dados dos níveis
            if (data.assessment_versions.schema === 'niveis') {
              const { data: levelsData, error: levelsError } = await supabase
                .from('assessment_levels')
                .select('*')
                .eq('assessment_version_id', data.assessment_version_id)
                .order('display_order', { ascending: true });

              if (!levelsError && levelsData && mounted) {
                setLevels(levelsData);

                // Carregar ranges de interpretação para cada nível
                const levelIds = levelsData.map(l => l.id);
                if (levelIds.length > 0) {
                  try {
                    const { data: rangesData, error: rangesError } = await supabase
                      .from('assessment_level_ranges')
                      .select('*')
                      .in('assessment_level_id', levelIds)
                      .order('min_score', { ascending: true });

                    if (rangesData && !rangesError && mounted) {
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

                // Calcular resultados de níveis com base nas respostas
                const levelResultsMap = {};
                const levelAnswersPayload = {};
                
                // Buscar as questões e alternativas para cada nível
                if (levelsData.length > 0) {
                  for (const level of levelsData) {
                    const { data: questionsData } = await supabase
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

                    let levelScore = 0;
                    let potentialScore = 0;
                    let maxLevelScore = 0;
                    let maxPotentialScore = 0;
                    let maxTotalScore = 0;

                    if (questionsData) {
                      questionsData.forEach(question => {
                        const answer = answersData[question.id];
                        const selectedAlternative = findSelectedAlternative(question.alternatives, answer);

                        levelAnswersPayload[level.id] = levelAnswersPayload[level.id] || {
                          itemId: level.id,
                          name: level.name,
                          questions: []
                        };
                        levelAnswersPayload[level.id].questions.push({
                          questionId: question.id,
                          questionText: question.text || `Pergunta ${question.display_order || ''}`.trim(),
                          answerText: selectedAlternative?.text || null,
                          answerValue: selectedAlternative?.score_value ?? answer ?? null,
                          isAnswered: !!selectedAlternative
                        });
                        
                        // Buscar máximos possíveis
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

                        // Se respondeu, somar
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

                if (mounted) {
                  setLevelResults(levelResultsMap);
                  setLevelAnswersMap(levelAnswersPayload);
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
              
              if (mounted) {
                setAssessmentRanges(rangesMap);
                setIndicatorsMeta(metaMap);
              }

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

                if (answeredQuestionsData && mounted) {
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
            const { data: overallRangesData, error: overallError } = await supabase
              .from('assessment_overall_ranges')
              .select('*')
              .eq('assessment_version_id', data.assessment_version_id)
              .order('min_score', { ascending: true });

            if (!overallError && overallRangesData) {
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
    setIsPreAssessmentAccordionOpen(isDesktop);
  }, [result?.id]);

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
  let xpConfig = XP_CONFIG[activityType] || XP_CONFIG.assessment;
  const assessmentVersionData = result?.assessment_versions;

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

    const fromConfiguredFields = configuredPreAssessmentFields
      .map((field) => {
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
  const hasAssessmentXP = assessmentVersionData?.gamify_xp && assessmentVersionData?.xp_completion > 0;

  const renderPreAssessmentAnswersCard = () => (
    <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-sm">
      <div>
        <button
          type="button"
          onClick={() => setIsPreAssessmentAccordionOpen((prev) => !prev)}
          className="w-full flex items-center justify-between text-left py-1 mb-2 min-h-6"
        >
          <span className="text-[#4F46E5] font-bold text-xs uppercase tracking-widest leading-none">
            Respostas pré-assessment
          </span>
          <span className="inline-flex items-center justify-center h-[18px] w-[18px] flex-shrink-0">
            {isPreAssessmentAccordionOpen ? <ChevronUp size={18} className="text-[#4F46E5]" /> : <ChevronDown size={18} className="text-[#4F46E5]" />}
          </span>
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
  
  // Override com configuração customizada do assessment se gamifyXp estiver ativado
  if (assessmentVersionData?.gamify_xp && assessmentVersionData?.xp_completion > 0) {
    xpConfig = {
      base: assessmentVersionData.xp_completion,
      bonusThresholds: {
        80: assessmentVersionData.xp_score_80_89 || 0,
        90: assessmentVersionData.xp_score_90_99 || 0,
        100: assessmentVersionData.xp_score_100 || 0
      }
    };
  }
  
  const totalXp = calculateXP(total, max, activityType);
  // If custom XP config, recalculate totalXp based on custom values
  let finalTotalXp = totalXp;
  if (assessmentVersionData?.gamify_xp && assessmentVersionData?.xp_completion > 0) {
    finalTotalXp = xpConfig.base;
    if (percentage >= 100) finalTotalXp += xpConfig.bonusThresholds[100] || 0;
    else if (percentage >= 90) finalTotalXp += xpConfig.bonusThresholds[90] || 0;
    else if (percentage >= 80) finalTotalXp += xpConfig.bonusThresholds[80] || 0;
  }
  
  const bonusXp = Math.max(0, finalTotalXp - xpConfig.base);
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

  const toggleIndicatorInterpretation = (key) => {
    setExpandedIndicatorInterpretations((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const sortedIndicators = Object.entries(indicatorResults)
    .sort(([, a], [, b]) => (b?.percentage ?? 0) - (a?.percentage ?? 0));

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
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF]">
      <style>{textFadeOutStyles}</style>
      {/* XP Overlay - Mesmo componente do Assessment */}
      {assessmentVersionData?.gamify_xp && assessmentVersionData?.xp_completion > 0 && xpOverlayData && (
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
                const shareResultId = result?.id || id;
                if (!shareResultId || shareResultId === 'undefined' || shareResultId === 'null') {
                  alert('Não foi possível gerar o link público deste resultado.');
                  return;
                }
                const publicUrl = `${window.location.origin}/#/public-results/${shareResultId}`;
                const shareText = `Veja meu resultado no assessment: ${assessmentName}!`;
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
            <div className="mb-6 bg-white/50 border border-white/60 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Info className="w-8 h-8 text-[#4F46E5] flex-shrink-0" />
                <p className="text-sm sm:text-base font-medium text-gray-700 leading-relaxed">
                  Estes resultados permancerão disponíveis na página Histórico e poderão ser revistos, baixados e compartilhados a qualquer momento.
                </p>
              </div>
            </div>

            {introductionText && (
              <div className="mb-8 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-sm">
                <p className="text-[#4F46E5] font-bold text-xs uppercase tracking-widest mb-3">
                  Introdução
                </p>
                <div>
                  <div
                    className={`prose prose-sm mt-6 sm:text-lg sm:prose-base max-w-none text-gray-700 leading-relaxed text-justify [text-align-last:left] overflow-hidden transition-all duration-300 [&_p]:mb-4 [&_p]:text-base [&_p]:leading-relaxed [&_ul]:my-4 [&_ol]:my-4 [&_li]:my-1 [&_strong]:font-semibold [&_em]:italic [&_a]:text-[#4F46E5] [&_a]:underline ${
                      expandedIntroduction ? '' : 'line-clamp-5 text-fade-out'
                    }`}
                    dangerouslySetInnerHTML={{ __html: introductionText }}
                  />
                  {!expandedIntroduction && (
                    <button
                      type="button"
                      onClick={() => setExpandedIntroduction(true)}
                      className="mt-2 text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity flex items-center gap-1"
                    >
                      Ver mais <ChevronDown size={16} />
                    </button>
                  )}
                  {expandedIntroduction && (
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
              />
            )}

            {/* RESULTADOS DE INDICADORES */}
            {assessmentSchema !== 'niveis' && assessmentData && Array.isArray(assessmentData.visualization_type) && assessmentData.visualization_type.length > 0 && (
              <div className="mt-8 grid gap-6">
                {/* Se ambos os gráficos estão selecionados, renderizar no mesmo card */}
                {assessmentData.visualization_type.includes('radar') && assessmentData.visualization_type.includes('horizontal-bar') ? (
                  <div className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm space-y-8">
                    <RadarChart indicatorResults={indicatorResults} indicatorMeta={indicatorsMeta} defaultLegendOpen={true} />
                    <div className="border-t border-gray-200 pt-6">
                      <HorizontalBarChart indicatorResults={indicatorResults} indicatorMeta={indicatorsMeta} />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Renderizar gráficos individualmente */}
                    {assessmentData.visualization_type.includes('radar') && (
                      <div className="bg-white/80 border border-white/60 rounded-2xl p-6 shadow-sm">
                        <RadarChart indicatorResults={indicatorResults} indicatorMeta={indicatorsMeta} defaultLegendOpen={true} />
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
                .map(([k, v]) => {
                const meta = resolveMeta(k, v);
                const displayName = resolveName(k, v);
                const indicatorKey = String(k);
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
                          <h3 className="text-lg font-semibold text-[#1E1B4B]">{displayName}</h3>
                        </div>
                      </div>
                      {/* Badge mobile: full width */}
                      <span
                        className="flex items-center justify-center w-full px-3 py-2 text-xs font-bold rounded-full uppercase"
                        style={getIndicatorBadgeStyle(v.percentage)}
                      >
                        {v.percentage}% • {v.classification}
                      </span>
                    </div>

                    {/* Layout Desktop */}
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
                        {/* Badge desktop: só classification */}
                        <span
                          className="inline-flex px-3 py-1 text-xs font-bold rounded-full uppercase"
                          style={getIndicatorBadgeStyle(v.percentage)}
                        >
                          {v.classification}
                        </span>
                        {/* Percentage grande: só desktop */}
                        <p className="text-2xl font-semibold text-[#1E1B4B] mt-2">{v.percentage}%</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      {v.interpretation && (
                        <p
                          data-indicator-interpretation-key={indicatorKey}
                          className={`text-base sm:text-lg text-gray-700 leading-relaxed text-justify [text-align-last:left] ${
                            expandedIndicatorInterpretations[indicatorKey]
                              ? ''
                              : truncatedIndicatorInterpretations[indicatorKey]
                                ? 'line-clamp-5 text-fade-out'
                                : ''
                          }`}
                        >
                          {v.interpretation}
                        </p>
                      )}

                      <div className="mt-2 flex items-center justify-between gap-4">
                        <div>
                          {v.interpretation && (
                            <>
                            {truncatedIndicatorInterpretations[indicatorKey] && !expandedIndicatorInterpretations[indicatorKey] && (
                              <button
                                onClick={() => toggleIndicatorInterpretation(indicatorKey)}
                                className="text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity"
                              >
                                Ver mais
                              </button>
                            )}

                            {expandedIndicatorInterpretations[indicatorKey] && (
                              <button
                                onClick={() => toggleIndicatorInterpretation(indicatorKey)}
                                className="text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity"
                              >
                                Ver menos
                              </button>
                            )}
                            </>
                          )}
                        </div>

                        <button
                          onClick={() => openIndicatorAnswers(indicatorKey, v)}
                          className="text-[#4F46E5] font-semibold text-base hover:opacity-90 transition-opacity"
                        >
                          Ver respostas
                        </button>
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

            {finalReflectionText && (
              <div className="mt-6 bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-sm">
                <p className="text-[#4F46E5] font-bold text-xs uppercase tracking-widest mb-3">
                  Reflexão final
                </p>
                <div
                  className="prose prose-sm mt-6 sm:text-lg sm:prose-base max-w-none text-gray-700 leading-relaxed text-justify [text-align-last:left] [&_p]:mb-4 [&_p]:text-base [&_p]:leading-relaxed [&_ul]:my-4 [&_ol]:my-4 [&_li]:my-1 [&_strong]:font-semibold [&_em]:italic [&_a]:text-[#4F46E5] [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: finalReflectionText }}
                />
              </div>
            )}
          </div>

          {/* Coluna lateral desktop */}
          <div className="hidden lg:flex flex-col gap-6">
            {hasAssessmentXP && (
              <XPRewardWidget
                totalXp={finalTotalXp}
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
            )}

            {shouldShowPreAssessmentAnswers && hasAssessmentXP && renderPreAssessmentAnswersCard()}

            <CallToActionCardLong
              icon={<ToolCase size={32} />}
              title="Aprofundamento"
              description={`Para saber mais sobre o seu ${assessmentName}, você pode acessar os materiais de aprofundamento gratuitos.`}
              buttonText="Acessar materiais"
              onButtonClick={() => window.open('https://www.innernetworking.com.br/', '_blank')}
            />

            {shouldShowPreAssessmentAnswers && !hasAssessmentXP && renderPreAssessmentAnswersCard()}
          </div>

{/* Versão mobile do card mt-8 de XP */}
          {hasAssessmentXP && (
            <div className="lg:hidden">
              <XPRewardWidget
                totalXp={finalTotalXp}
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
          )}
          

 {/* Card de chamada para ação para textos longos */}
              <div className="lg:hidden">
                <CallToActionCardLong
                  icon={<ToolCase size={32} />}
                  title="Aprofundamento"
                  description={`Para saber mais sobre o seu ${assessmentName}, você pode acessar os materiais de aprofundamento gratuitos.`}
                  buttonText="Acessar materiais"
                  onButtonClick={() => window.open('https://www.innernetworking.com.br/', '_blank')}
                />
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
            <>
              {suggestedAssessments.length === 0 ? (
                <div className="bg-white/80 border border-white/60 rounded-2xl p-6 text-sm text-gray-600">
                  Nenhuma sugestao encontrada agora.
                </div>
              ) : (
                <>
                  {/* Mobile: Carrossel */}
                  <div className="md:hidden overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
                    <div className="flex gap-4 pb-2 pr-4">
                      {suggestedAssessments.map(assessment => (
                        <button
                          key={assessment.id}
                          type="button"
                          onClick={() => navigate(`/assessment/${assessment.id}`)}
                          className="group bg-white/80 border border-white/60 rounded-2xl p-6 text-left shadow-sm hover:shadow-lg transition flex-shrink-0 w-[85vw] snap-center"
                        >
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
                      ))}
                    </div>
                  </div>

                  {/* Desktop: Grid */}
                  <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6">
                    {suggestedAssessments.map(assessment => (
                      <button
                        key={assessment.id}
                        type="button"
                        onClick={() => navigate(`/assessment/${assessment.id}`)}
                        className="group bg-white/80 border border-white/60 rounded-2xl p-6 text-left shadow-sm hover:shadow-lg transition"
                      >
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
                    ))}
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
