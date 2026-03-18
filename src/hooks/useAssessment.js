import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { getActiveAssessmentVersion } from '../utils/assessmentVersions';

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const slugify = (value) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)+/g, '');

export const useAssessment = (options = {}) => {
  const { assessmentIdOrSlug } = options;
  const [assessment, setAssessment] = useState(null);
  const [assessmentVersionId, setAssessmentVersionId] = useState(null);
  const [versionNumber, setVersionNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({}); // { [questionId]: score_value }
  const [submitting, setSubmitting] = useState(false);
  const [introductionHtml, setIntroductionHtml] = useState('');
  const [overallRanges, setOverallRanges] = useState([]);
  const [preAssessmentFields, setPreAssessmentFields] = useState([]);
  const [preAssessmentAnswers, setPreAssessmentAnswers] = useState({});
  const [gamifyXp, setGamifyXp] = useState(false);
  const [xpCompletion, setXpCompletion] = useState(0);
  const [xpScore80, setXpScore80] = useState(0);
  const [xpScore90, setXpScore90] = useState(0);
  const [xpScore100, setXpScore100] = useState(0);
  const [showIndicatorIntro, setShowIndicatorIntro] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssessment();
  }, [assessmentIdOrSlug]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      
      // 1. Buscar assessment ativo (por slug/id ou default)
      let assessmentData = null;
      let assessmentError = null;

      if (assessmentIdOrSlug) {
        if (isUuid(assessmentIdOrSlug)) {
          const { data, error } = await supabase
            .from('assessments')
            .select('*')
            .eq('id', assessmentIdOrSlug)
            .eq('is_active', true)
            .single();
          assessmentData = data;
          assessmentError = error;
        } else {
          const { data, error } = await supabase
            .from('assessments')
            .select('*')
            .eq('is_active', true);
          if (error) throw error;

          const match = (data || []).find(item => slugify(item.name || '') === assessmentIdOrSlug);
          if (!match) throw new Error('Assessment nao encontrado ou desativado.');
          assessmentData = match;
        }
      } else {
        const { data, error } = await supabase
          .from('assessments')
          .select('*')
          .eq('is_active', true)
          .limit(1)
          .single();
        assessmentData = data;
        assessmentError = error;
      }

      if (assessmentError) throw assessmentError;
      if (!assessmentData) throw new Error('Nenhum assessment ativo encontrado.');

      // 2. Buscar versão ativa do assessment E carregar introduction_html + overall_ranges
      const activeVersion = await getActiveAssessmentVersion(assessmentData.id);

      // Buscar introduction_html, schema, level_mode, pre_assessment_fields e XP config
      const { data: versionData, error: versionError } = await supabase
        .from('assessment_versions')
        .select('introduction_html, schema, level_mode, pre_assessment_fields, gamify_xp, xp_completion, xp_score_80_89, xp_score_90_99, xp_score_100, show_indicator_intro')
        .eq('id', activeVersion.id)
        .single();

      if (versionError) console.warn('Erro ao carregar version data:', versionError);
      if (versionData?.introduction_html) {
        setIntroductionHtml(versionData.introduction_html);
      }
      if (versionData?.pre_assessment_fields) {
        setPreAssessmentFields(versionData.pre_assessment_fields);
      }
      
      // Carregar configurações de XP
      if (versionData?.gamify_xp) {
        setGamifyXp(true);
        setXpCompletion(versionData.xp_completion || 0);
        setXpScore80(versionData.xp_score_80_89 || 0);
        setXpScore90(versionData.xp_score_90_99 || 0);
        setXpScore100(versionData.xp_score_100 || 0);
      }
      
      // Carregar configuração de exibição de intros de indicadores/níveis
      setShowIndicatorIntro(versionData?.show_indicator_intro !== false);

      const assessmentSchema = versionData?.schema || assessmentData.schema || 'indicadores';
      const levelMode = versionData?.level_mode;

      const { data: overallRangesData, error: overallRangesError } = await supabase
        .from('assessment_overall_ranges')
        .select('*')
        .eq('assessment_version_id', activeVersion.id)
        .order('min_score', { ascending: true });

      if (overallRangesError) console.warn('Erro ao carregar overall_ranges:', overallRangesError);
      if (overallRangesData) {
        setOverallRanges(overallRangesData);
      }
      setAssessmentVersionId(activeVersion.id);
      setVersionNumber(activeVersion.version_number);

      // 3. Decidir qual estrutura carregar baseado no schema
      let fullAssessment;
      
      if (assessmentSchema === 'niveis') {
        fullAssessment = await fetchNiveisAssessment(assessmentData, activeVersion, levelMode);
      } else {
        fullAssessment = await fetchIndicadoresAssessment(assessmentData, activeVersion);
      }

      setAssessment(fullAssessment);
    } catch (err) {
      console.error('Erro ao carregar assessment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar assessment schema='niveis'
  const fetchNiveisAssessment = async (assessmentData, activeVersion, levelMode) => {
    // 1. Buscar levels
    const { data: levelsData, error: levelsError } = await supabase
      .from('assessment_levels')
      .select('*')
      .eq('assessment_version_id', activeVersion.id)
      .order('display_order', { ascending: true });

    if (levelsError) throw levelsError;
    const levels = levelsData || [];

    // 2. Buscar questions linkadas aos levels (via level_id)
    const levelIds = levels.map(l => l.id);
    let questions = [];

    if (levelIds.length > 0) {
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('level_id', levelIds)
        .order('display_order', { ascending: true });

      if (questionsError) throw questionsError;
      questions = questionsData || [];
    }

    // 3. Buscar alternatives com score_target
    const questionIds = questions.map(q => q.id);
    let alternatives = [];

    if (questionIds.length > 0) {
      const { data: alternativesData, error: alternativesError } = await supabase
        .from('alternatives')
        .select('*')
        .in('question_id', questionIds)
        .order('display_order', { ascending: true });

      if (alternativesError) throw alternativesError;
      alternatives = alternativesData || [];
    }

    // 4. Montar estrutura hierárquica
    return {
      ...assessmentData,
      versionId: activeVersion.id,
      versionNumber: activeVersion.version_number,
      schema: 'niveis',
      levelMode,
      levels: levels.map(level => ({
        ...level,
        questions: questions
          .filter(q => q.level_id === level.id)
          .map(question => ({
            ...question,
            alternatives: alternatives.filter(a => a.question_id === question.id)
          }))
      }))
    };
  };

  // Função para carregar assessment schema='indicadores' (código existente)
  const fetchIndicadoresAssessment = async (assessmentData, activeVersion) => {
    // 3. Buscar assessment_indicators com indicadores relacionados (usando assessment_version_id)
    const { data: assessmentIndicators, error: aiError } = await supabase
      .from('assessment_indicators')
      .select(`
        id,
        indicator_master_id,
        display_order,
        indicators_master:indicator_master_id (id, name, description, color, icon)
      `)
      .eq('assessment_version_id', activeVersion.id)
      .order('display_order', { ascending: true });

    if (aiError) throw aiError;

    // 4. Buscar indicadores (antiga estrutura ainda usada para questions) COM conceptual_description
    const { data: indicatorsData, error: indicatorsError } = await supabase
      .from('indicators')
      .select('id, assessment_id, name, conceptual_description, indicator_master_id, display_order, weight')
      .eq('assessment_id', assessmentData.id)
      .order('display_order', { ascending: true });

    if (indicatorsError) throw indicatorsError;
    const indicators = indicatorsData || [];

    // Criar mapa de conceptual_description por indicator_master_id
    const conceptualDescMap = {};
    indicators.forEach(ind => {
      if (ind.indicator_master_id) {
        conceptualDescMap[ind.indicator_master_id] = ind.conceptual_description || '';
      }
    });

    // 5. Buscar questions
    const indicatorIds = indicators.map(i => i.id);
    let questions = [];

    if (indicatorIds.length > 0) {
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .in('indicator_id', indicatorIds)
        .order('display_order', { ascending: true });

      if (questionsError) throw questionsError;
      questions = questionsData || [];
    }

    // 6. Buscar alternatives
    const questionIds = questions.map(q => q.id);
    let alternatives = [];

    if (questionIds.length > 0) {
      const { data: alternativesData, error: alternativesError } = await supabase
        .from('alternatives')
        .select('*')
        .in('question_id', questionIds)
        .order('display_order', { ascending: true });

      if (alternativesError) throw alternativesError;
      alternatives = alternativesData || [];
    }

    // 7. Buscar assessment_indicator_ranges para cada assessment_indicator
    const rangesMap = {}; // { assessmentIndicatorId: [...ranges] }
    if (assessmentIndicators && assessmentIndicators.length > 0) {
      const aiIds = assessmentIndicators.map(ai => ai.id);
      const { data: rangesData, error: rangesError } = await supabase
        .from('assessment_indicator_ranges')
        .select('*')
        .in('assessment_indicator_id', aiIds);

      if (rangesError) {
        throw rangesError;
      }
      (rangesData || []).forEach(range => {
        if (!rangesMap[range.assessment_indicator_id]) {
          rangesMap[range.assessment_indicator_id] = [];
        }
        rangesMap[range.assessment_indicator_id].push(range);
      });
    }

    // 8. Montar estrutura hierárquica com nova arquitetura
    return {
      ...assessmentData,
      versionId: activeVersion.id,
      versionNumber: activeVersion.version_number,
      schema: 'indicadores',
      indicators: (indicators || []).map(indicator => {
        // Fallback: conceptual_description (indicators) -> description (indicators_master)
        const masterId = indicator.indicator_master_id;
        const masterData = (assessmentIndicators || []).find(ai => ai.indicator_master_id === masterId);
        const masterDescription = masterData?.indicators_master?.description || '';
        
        return {
          ...indicator,
          conceptual_description: indicator.conceptual_description || masterDescription,
          questions: (questions || [])
            .filter(q => q.indicator_id === indicator.id)
            .map(question => ({
              ...question,
              alternatives: (alternatives || []).filter(
                a => a.question_id === question.id
              )
            }))
        };
      }),
      // Nova estrutura: assessment_indicators com ranges
      assessmentIndicators: (assessmentIndicators || []).map(ai => {
        const ranges = rangesMap[ai.id] || [];
        return {
          id: ai.id,
          display_order: ai.display_order,
          indicatorMaster: ai.indicators_master,
          ranges // Faixas de classificação
        };
      })
    };
  };

  const handleAnswerChange = (questionId, scoreValue) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: scoreValue
    }));
  };

  const validateAnswers = () => {
    if (!assessment) return false;
    
    // Schema 'niveis': validar questions dentro de levels
    if (assessment.schema === 'niveis' && assessment.levels) {
      for (const level of assessment.levels) {
        for (const question of level.questions || []) {
          if (question.is_required && answers[question.id] === undefined) {
            return false;
          }
        }
      }
      return true;
    }
    
    // Schema 'indicadores': validar questions dentro de indicators
    for (const indicator of assessment.indicators || []) {
      for (const question of indicator.questions || []) {
        if (question.is_required && answers[question.id] === undefined) {
          return false;
        }
      }
    }
    return true;
  };

  const calculateNiveisResults = () => {
    const levelResults = {};
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Calcular pontos por nível, separando 'level' e 'potential'
    assessment.levels.forEach(level => {
      let levelScore = 0;
      let potentialScore = 0;
      let maxLevelScore = 0;
      let maxPotentialScore = 0;
      let maxTotalScore = 0;

      level.questions.forEach(question => {
        const answer = answers[question.id];
        
        // Calcular máximos possíveis por target  para cada questão
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

        // Se respondeu, somar a pontuação
        if (answer !== undefined && answer !== null) {
          const selectedAlternative = question.alternatives.find(alt => alt.score_value === answer);
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

      levelResults[level.id] = {
        level_id: level.id,
        name: level.name,
        description: level.description,
        levelScore,
        potentialScore,
        maxLevelScore,
        maxPotentialScore,
        maxTotalScore,
        display_order: level.display_order
      };

      totalScore += levelScore + potentialScore;
      maxPossibleScore += maxTotalScore;
    });

    return { totalScore, maxPossibleScore, levelResults, indicatorResults: null };
  };

  const calculateResults = () => {
    // Se for schema='niveis', calcular de forma diferente
    if (assessment.schema === 'niveis') {
      return calculateNiveisResults();
    }
    
    let totalScore = 0;
    let maxPossibleScore = 0;
    const indicatorScores = {};
    const indicatorResults = {};

    // Fallback para classificação hardcoded (compatibilidade com dados antigos)
    const classifyFallback = (percentage) => {
      if (percentage <= 40) return 'Crítico';
      if (percentage <= 70) return 'Moderado';
      return 'Saudável';
    };

    const generateInterpretationFallback = (name, percentage) => {
      if (percentage <= 40)
        return `O indicador ${name} apresenta nível crítico e requer atenção imediata.`;
      if (percentage <= 70)
        return `O indicador ${name} apresenta nível moderado, com oportunidades claras de melhoria.`;
      return `O indicador ${name} apresenta nível saudável e consistente.`;
    };

    // Função para encontrar a faixa e classificação
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

      // Encontrar a faixa que contém o score baseado na PERCENTAGE
      for (const range of sortedRanges) {
        if (percentage >= range.min_score && percentage <= range.max_score) {
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

    // Determinar se usamos a nova arquitetura (Assessment Indicators) ou fallback
    const useNewArchitecture = assessment.assessmentIndicators && assessment.assessmentIndicators.length > 0;

    if (useNewArchitecture) {
      // NOVA ARQUITETURA: Usar assessment_indicators como fonte da verdade
      assessment.assessmentIndicators.forEach(ai => {
        const indicator = ai.indicatorMaster;
        if (!indicator) return;

        // Encontrar as questions do indicador.
        // Tentamos vincular pelo indicator_master_id (mais seguro) ou fallback para ordem
        let linkedOldIndicator = assessment.indicators.find(ind => ind.indicator_master_id === indicator.id);
        
        // Fallback para display_order se não encontrar pelo ID (compatibilidade com dados migrados parcialmente)
        if (!linkedOldIndicator) {
           linkedOldIndicator = assessment.indicators.find(ind => ind.id === assessment.indicators[ai.display_order - 1]?.id);
        }

        const indicatorQuestions = linkedOldIndicator?.questions || [];

        let indicatorScore = 0;
        let indicatorMax = 0;

        indicatorQuestions.forEach(question => {
          const score = answers[question.id] || 0;
          indicatorScore += score;

          const maxQuestionScore = (question.alternatives || []).reduce((max, alt) =>
            Math.max(max, alt.score_value), 0);
          indicatorMax += maxQuestionScore;
        });

        const classificationData = getClassificationFromRanges(indicatorScore, indicatorMax, ai.ranges, indicator.name);

        const indicatorKey = indicator.id || indicator.name;
        indicatorResults[indicatorKey] = {
          indicator_id: indicator.id || null,
          name: indicator.name,
          score: indicatorScore,
          maxScore: indicatorMax,
          percentage: classificationData.percentage,
          classification: classificationData.classification,
          interpretation: classificationData.interpretation
        };

        indicatorScores[indicatorKey] = indicatorScore;
        totalScore += indicatorScore;
        maxPossibleScore += indicatorMax;
      });
    } else {
      // ANTIGA ARQUITETURA (Fallback): Usar indicators diretos
      assessment.indicators.forEach(indicator => {
        let indicatorScore = 0;
        let indicatorMax = 0;

        indicator.questions.forEach(question => {
          const score = answers[question.id] || 0;
          indicatorScore += score;

          const maxQuestionScore = (question.alternatives || []).reduce((max, alt) =>
            Math.max(max, alt.score_value), 0);
          indicatorMax += maxQuestionScore;
        });

        const classificationData = getClassificationFromRanges(indicatorScore, indicatorMax, [], indicator.name);

        const indicatorKey = indicator.indicator_master_id || indicator.name;
        indicatorResults[indicatorKey] = {
          indicator_id: indicator.indicator_master_id || null,
          name: indicator.name,
          score: indicatorScore,
          maxScore: indicatorMax,
          percentage: classificationData.percentage,
          classification: classificationData.classification,
          interpretation: classificationData.interpretation
        };

        indicatorScores[indicatorKey] = indicatorScore;
        totalScore += indicatorScore;
        maxPossibleScore += indicatorMax;
      });
    }

    return { totalScore, maxPossibleScore, indicatorResults };
  };

  const submitAssessment = async () => {
    if (!validateAnswers()) {
      alert('Por favor, responda todas as perguntas obrigatórias.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const results = calculateResults();
      const { totalScore, maxPossibleScore, indicatorResults } = results;
      const isNiveisSchema = assessment.schema === 'niveis';
      const indicatorSnapshot = isNiveisSchema ? null : (indicatorResults || null);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      const displayName = profileData?.display_name || user.user_metadata?.display_name || user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'Usuário';

      const payload = {
        assessment_id: assessment.id,
        assessment_version: versionNumber, // INTEGER: número da versão (1, 2, 3, etc)
        assessment_version_id: assessmentVersionId, // UUID: referência para assessment_versions.id
        user_id: user.id,
        user_display_name: displayName,
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        indicator_scores_snapshot: indicatorSnapshot,
        answers_snapshot: answers,
        classification_snapshot: indicatorSnapshot,
        pre_assessment_data: Object.keys(preAssessmentAnswers).length > 0 ? preAssessmentAnswers : null,
        activity_type: 'assessment', // Gamificação: tipo de atividade
        activity_name: assessment.name, // Gamificação: nome descritivo da atividade
        xp_awarded: false, // Marca que XP ainda não foi concedido
        assessment_schema: assessment.schema || 'indicadores', // Schema: 'indicadores' | 'niveis' - usado por triggers
      };

      const { error: insertError } = await supabase
        .from('assessment_events')
        .insert([payload]);

      if (insertError) throw insertError;

      navigate('/results');
    } catch (err) {
      console.error('Erro ao salvar assessment:', err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    assessment,
    assessmentVersionId,
    versionNumber,
    loading,
    error,
    answers,
    handleAnswerChange,
    submitAssessment,
    submitting,
    introductionHtml,
    overallRanges,
    preAssessmentFields,
    preAssessmentAnswers,
    setPreAssessmentAnswers,
    gamifyXp,
    xpCompletion,
    xpScore80,
    xpScore90,
    xpScore100,
    showIndicatorIntro
  };
};