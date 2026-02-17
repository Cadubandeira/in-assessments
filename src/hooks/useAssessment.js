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
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssessment();
  }, [assessmentIdOrSlug]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      console.log('useAssessment: Iniciando busca...');
      
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

      console.log('useAssessment: Assessment Data:', assessmentData, 'Error:', assessmentError);
      if (assessmentError) throw assessmentError;
      if (!assessmentData) throw new Error('Nenhum assessment ativo encontrado.');

      // 2. Buscar versão ativa do assessment E carregar introduction_html + overall_ranges
      const activeVersion = await getActiveAssessmentVersion(assessmentData.id);

      // Buscar introduction_html e overall_ranges
      const { data: versionData, error: versionError } = await supabase
        .from('assessment_versions')
        .select('introduction_html')
        .eq('id', activeVersion.id)
        .single();

      if (versionError) console.warn('Erro ao carregar introduction_html:', versionError);
      if (versionData?.introduction_html) {
        setIntroductionHtml(versionData.introduction_html);
      }

      const { data: overallRangesData, error: overallRangesError } = await supabase
        .from('assessment_overall_ranges')
        .select('*')
        .eq('assessment_version_id', activeVersion.id)
        .order('min_score', { ascending: true });

      if (overallRangesError) console.warn('Erro ao carregar overall_ranges:', overallRangesError);
      if (overallRangesData) {
        setOverallRanges(overallRangesData);
      }
      console.log('useAssessment: Active Version:', activeVersion);
      
      setAssessmentVersionId(activeVersion.id);
      setVersionNumber(activeVersion.version_number);

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

      console.log('useAssessment: Assessment Indicators:', assessmentIndicators, 'Error:', aiError);
      if (aiError) throw aiError;

      // 4. Buscar indicadores (antiga estrutura ainda usada para questions) COM conceptual_description
      const { data: indicatorsData, error: indicatorsError } = await supabase
        .from('indicators')
        .select('id, assessment_id, name, conceptual_description, indicator_master_id, display_order, weight')
        .eq('assessment_id', assessmentData.id)
        .order('display_order', { ascending: true });

      console.log('useAssessment: Indicators:', indicatorsData, 'Error:', indicatorsError);
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
        console.log('🔍 DEBUG useAssessment: Buscando ranges para assessment_indicators:', aiIds);
        const { data: rangesData, error: rangesError } = await supabase
          .from('assessment_indicator_ranges')
          .select('*')
          .in('assessment_indicator_id', aiIds);

        if (rangesError) {
          console.error('❌ DEBUG useAssessment: Erro ao buscar ranges:', rangesError);
          throw rangesError;
        }
        console.log('🔍 DEBUG useAssessment: Ranges carregadas do banco:', rangesData);
        (rangesData || []).forEach(range => {
          if (!rangesMap[range.assessment_indicator_id]) {
            rangesMap[range.assessment_indicator_id] = [];
          }
          rangesMap[range.assessment_indicator_id].push(range);
        });
        console.log('📊 DEBUG useAssessment: rangesMap final:', rangesMap);
      }

      // 8. Montar estrutura hierárquica com nova arquitetura
      const fullAssessment = {
        ...assessmentData,
        versionId: activeVersion.id,
        versionNumber: activeVersion.version_number,
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
          console.log(`📊 DEBUG useAssessment: Indicador ${ai.indicators_master?.name} (ID: ${ai.id}) tem ${ranges.length} ranges:`, ranges);
          return {
            id: ai.id,
            display_order: ai.display_order,
            indicatorMaster: ai.indicators_master,
            ranges // Faixas de classificação
          };
        })
      };

      console.log('useAssessment: Full Structure:', fullAssessment);
      setAssessment(fullAssessment);
    } catch (err) {
      console.error('Erro ao carregar assessment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, scoreValue) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: scoreValue
    }));
  };

  const validateAnswers = () => {
    if (!assessment) return false;
    for (const indicator of assessment.indicators) {
      for (const question of indicator.questions) {
        if (question.is_required && answers[question.id] === undefined) {
          return false;
        }
      }
    }
    return true;
  };

  const calculateResults = () => {
    console.log('📊 DEBUG calculateResults: Iniciando cálculo de resultados');
    console.log('📊 DEBUG calculateResults: Assessment structure:', assessment);
    console.log('📊 DEBUG calculateResults: Respostas:', answers);
    
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
    console.log(`📊 DEBUG calculateResults: Usando ${useNewArchitecture ? 'NOVA ARQUITETURA' : 'FALLBACK (antiga arquitetura)'}`);
    console.log('📊 DEBUG calculateResults: Assessment Indicators:', assessment.assessmentIndicators);

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
        console.log(`📊 DEBUG: ${indicator.name} - Score: ${indicatorScore}/${indicatorMax}, Ranges:`, ai.ranges, 'Resultado:', classificationData);

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

    console.log('📊 DEBUG calculateResults: Resultados finais calculados:', {
      totalScore,
      maxPossibleScore,
      indicatorResults
    });

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

      const { totalScore, maxPossibleScore, indicatorResults } = calculateResults();

      // Extract display name from user metadata or use email as fallback
      const displayName = user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'Usuário';

      const payload = {
        assessment_id: assessment.id,
        assessment_version: versionNumber, // INTEGER: número da versão (1, 2, 3, etc)
        assessment_version_id: assessmentVersionId, // UUID: referência para assessment_versions.id
        user_id: user.id,
        user_display_name: displayName,
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        indicator_scores_snapshot: indicatorResults,
        answers_snapshot: answers,
        classification_snapshot: indicatorResults,
        activity_type: 'assessment', // Gamificação: tipo de atividade
        activity_name: assessment.name, // Gamificação: nome descritivo da atividade
      };

      console.log('💾 DEBUG submitAssessment: Salvando payload:', payload);
      console.log('💾 DEBUG submitAssessment: classification_snapshot que será salvo:', indicatorResults);

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
    overallRanges
  };
};